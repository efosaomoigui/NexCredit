import json
import uuid
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from services.lending_engine.app.api.v1.routes import loans as loans_routes
from services.lending_engine.app.schemas.loans import LoanApplicationRequest
from shared.models import LoanApplicationStatus, LoanStatus


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return self._value if isinstance(self._value, list) else []


class _FakeDb:
    def __init__(self, execute_results):
        self._execute_results = list(execute_results)
        self.added = []
        self.commit_count = 0
        self.rollback_count = 0

    async def execute(self, _stmt):
        if not self._execute_results:
            raise AssertionError("Unexpected query execution order")
        return _ScalarResult(self._execute_results.pop(0))

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None

    async def refresh(self, _obj):
        return None

    async def commit(self):
        self.commit_count += 1

    async def rollback(self):
        self.rollback_count += 1


class _FakeDbCommitFails(_FakeDb):
    async def commit(self):
        raise loans_routes.SQLAlchemyError("write failed")


class _FakeDbIntegrityRace(_FakeDb):
    async def commit(self):
        raise loans_routes.IntegrityError("insert", {}, Exception("duplicate key"))


class _FakeDbFlushFails(_FakeDb):
    async def flush(self):
        raise loans_routes.SQLAlchemyError("flush failed")


@pytest.mark.asyncio
async def test_first_time_onboarding_and_acceptance_persists_records():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        name="Starter",
        description="Starter product",
        min_amount=1000,
        max_amount=50000,
        min_tenor=7,
        max_tenor=90,
        interest_rate=0.05,
        fees={"processing_fee": 500},
        eligibility_rules={},
        is_active=True,
    )
    kyc = SimpleNamespace(bvn_verified=True, selfie_score=0.95)
    app = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        product_id=product.id,
        approved_amount=10000,
        requested_amount=10000,
        tenor=30,
        status=LoanApplicationStatus.AGREEMENT_PENDING,
    )

    db_for_apply = _FakeDb([kyc, None, None, [], [product], product])
    payload = LoanApplicationRequest(requested_amount=10000, tenor=30, purpose="Personal")
    apply_response = await loans_routes.apply_for_loan(data=payload, db=db_for_apply, user=user)
    apply_body = json.loads(apply_response.body.decode())
    assert apply_body["success"] is True
    assert any(obj.__class__.__name__ == "LoanApplication" for obj in db_for_apply.added)

    db_for_accept = _FakeDb([app, product, None, None, 0])
    request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
    acceptance_response = await loans_routes.accept_agreement(
        application_id=app.id, request=request, db=db_for_accept, user=user
    )
    acceptance_body = json.loads(acceptance_response.body.decode())
    assert acceptance_body["success"] is True
    assert acceptance_body["data"]["application_status"] == LoanApplicationStatus.DISBURSE_PENDING.value
    assert acceptance_body["data"]["repayment_schedule"][0]["amount_due"] == 11000
    assert any(obj.__class__.__name__ == "Loan" for obj in db_for_accept.added)
    assert any(obj.__class__.__name__ == "ConsentRecord" for obj in db_for_accept.added)


@pytest.mark.asyncio
async def test_acceptance_retry_is_idempotent_and_returns_existing_state():
    user = SimpleNamespace(id=uuid.uuid4())
    app = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        status=LoanApplicationStatus.DISBURSE_PENDING,
    )
    existing_loan = SimpleNamespace(id=uuid.uuid4(), status=LoanStatus.ACTIVE)
    existing_schedule = [SimpleNamespace(installment_no=1, due_date=date(2026, 6, 1), amount_due=10500, status="pending")]
    db = _FakeDb([app, existing_loan, existing_schedule])
    request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    response = await loans_routes.accept_agreement(application_id=app.id, request=request, db=db, user=user)
    body = json.loads(response.body.decode())

    assert body["success"] is True
    assert body["data"]["application_status"] == LoanApplicationStatus.DISBURSE_PENDING.value
    assert body["data"]["loan_id"] == str(existing_loan.id)
    assert not any(obj.__class__.__name__ == "Loan" for obj in db.added)


@pytest.mark.asyncio
async def test_acceptance_failure_returns_recoverable_error_code():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        interest_rate=0.05,
        fees={"processing_fee": 500},
    )
    app = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        product_id=product.id,
        approved_amount=10000,
        requested_amount=10000,
        tenor=30,
        status=LoanApplicationStatus.AGREEMENT_PENDING,
    )
    db = _FakeDbCommitFails([app, product, None, None, 0])
    request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    response = await loans_routes.accept_agreement(application_id=app.id, request=request, db=db, user=user)
    body = json.loads(response.body.decode())
    assert response.status_code == 503
    assert body["success"] is False
    assert body["error"]["code"] == "ACCEPTANCE_PERSISTENCE_RETRYABLE"
    assert db.rollback_count == 1


@pytest.mark.asyncio
async def test_acceptance_flush_failure_returns_recoverable_error_code():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        interest_rate=0.05,
        fees={"processing_fee": 500},
    )
    app = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        product_id=product.id,
        approved_amount=10000,
        requested_amount=10000,
        tenor=30,
        status=LoanApplicationStatus.AGREEMENT_PENDING,
    )
    db = _FakeDbFlushFails([app, product, None])
    request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    response = await loans_routes.accept_agreement(application_id=app.id, request=request, db=db, user=user)
    body = json.loads(response.body.decode())
    assert response.status_code == 503
    assert body["success"] is False
    assert body["error"]["code"] == "ACCEPTANCE_PERSISTENCE_RETRYABLE"
    assert db.rollback_count == 1


@pytest.mark.asyncio
async def test_acceptance_integrity_race_returns_idempotent_success():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        interest_rate=0.05,
        fees={"processing_fee": 500},
    )
    app = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=user.id,
        product_id=product.id,
        approved_amount=10000,
        requested_amount=10000,
        tenor=30,
        status=LoanApplicationStatus.AGREEMENT_PENDING,
    )
    refreshed_app = SimpleNamespace(id=app.id, status=LoanApplicationStatus.DISBURSE_PENDING)
    existing_loan = SimpleNamespace(id=uuid.uuid4(), status=LoanStatus.ACTIVE)
    existing_schedule = [SimpleNamespace(installment_no=1, due_date=date(2026, 6, 1), amount_due=10500, status="pending")]
    db = _FakeDbIntegrityRace([app, product, None, None, 0, refreshed_app, existing_loan, existing_schedule])
    request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))

    response = await loans_routes.accept_agreement(application_id=app.id, request=request, db=db, user=user)
    body = json.loads(response.body.decode())

    assert body["success"] is True
    assert body["data"]["application_status"] == LoanApplicationStatus.DISBURSE_PENDING.value
    assert body["data"]["loan_id"] == str(existing_loan.id)
    assert db.rollback_count == 1


@pytest.mark.asyncio
async def test_workflow_state_prefers_active_loan_guard():
    user = SimpleNamespace(id=uuid.uuid4())
    active_loan = SimpleNamespace(id=uuid.uuid4(), status=LoanStatus.ACTIVE)
    db = _FakeDb([[active_loan]])

    response = await loans_routes.workflow_state(db=db, user=user)
    body = json.loads(response.body.decode())

    assert body["success"] is True
    assert body["data"]["checkpoint"] == "complete"
    assert body["data"]["has_active_loan"] is True
    assert body["data"]["active_loan_id"] == str(active_loan.id)


@pytest.mark.asyncio
async def test_workflow_state_returns_checkpoint_from_latest_application():
    user = SimpleNamespace(id=uuid.uuid4())
    latest_app = SimpleNamespace(
        id=uuid.uuid4(),
        status=LoanApplicationStatus.AGREEMENT_PENDING,
    )
    db = _FakeDb([[], latest_app])

    response = await loans_routes.workflow_state(db=db, user=user)
    body = json.loads(response.body.decode())

    assert body["success"] is True
    assert body["data"]["checkpoint"] == "offer_ready"
    assert body["data"]["workflow_status"] == LoanApplicationStatus.AGREEMENT_PENDING.value
    assert body["data"]["application_id"] == str(latest_app.id)
