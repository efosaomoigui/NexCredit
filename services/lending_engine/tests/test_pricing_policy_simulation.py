import uuid
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from services.lending_engine.app.api.v1.routes import loans as loans_routes
from services.lending_engine.app.services.pricing_policy import PricingPolicyService


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return self._value if isinstance(self._value, list) else []


class _FakeDb:
    def __init__(self, execute_results):
        self._execute_results = list(execute_results)

    async def execute(self, _stmt):
        if not self._execute_results:
            raise AssertionError("Unexpected query execution order")
        return _ScalarResult(self._execute_results.pop(0))


@pytest.mark.asyncio
async def test_evaluate_for_user_uses_simulated_credit_profile_limit_and_scores():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        name="QuickCash 30",
        description="Flexible loan",
        min_amount=5000,
        max_amount=250000,
        min_tenor=30,
        max_tenor=30,
        interest_rate=0.2,
        fees={"processing_fee": 1000},
        eligibility_rules={},
    )
    kyc = SimpleNamespace(user_id=user.id, bvn_hash="22345678901")
    sim_credit = SimpleNamespace(score=54, recommended_limit=90000)
    db = _FakeDb([None, [], [product], kyc, sim_credit])

    result = await PricingPolicyService.evaluate_for_user(db, user)

    assert result["selected_product"] is not None
    assert result["measured_scores"]["credit_score"] == 54
    assert result["measured_scores"]["composite_score"] == 54
    assert result["selected_product"]["effective_max_limit"] == 90000
    assert "SIMULATED_CREDIT_PROFILE_USED" in result["pricing_reason_codes"]


@pytest.mark.asyncio
async def test_evaluate_for_user_respects_score_gate_with_simulated_credit():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        name="QuickCash 14",
        description="Fast micro-loan",
        min_amount=2000,
        max_amount=15000,
        min_tenor=14,
        max_tenor=14,
        interest_rate=0.125,
        fees={"processing_fee": 500},
        eligibility_rules={},
    )
    active_cfg = SimpleNamespace(
        version="pricing_policy_test",
        config={
            "score_gates": {"credit_score_min": 70, "location_score_min": 0, "composite_score_min": 0},
            "rate_multipliers": {"high": 0.85, "medium": 1.0, "low": 1.15},
            "limit_multipliers": {"high": 1.0, "medium": 0.85, "low": 0.6},
        },
    )
    kyc = SimpleNamespace(user_id=user.id, bvn_hash="22567890123")
    sim_credit = SimpleNamespace(score=62, recommended_limit=150000)
    db = _FakeDb([active_cfg, [], [product], kyc, sim_credit])

    result = await PricingPolicyService.evaluate_for_user(db, user)

    assert result["selected_product"] is None
    assert "CREDIT_SCORE_BELOW_MIN" in result["pricing_reason_codes"]
    assert "SIMULATED_CREDIT_PROFILE_USED" in result["pricing_reason_codes"]


@pytest.mark.asyncio
async def test_loan_eligibility_endpoint_uses_simulated_credit_profile_contract():
    user = SimpleNamespace(id=uuid.uuid4())
    product = SimpleNamespace(
        id=uuid.uuid4(),
        name="QuickCash 30",
        description="Flexible loan",
        min_amount=5000,
        max_amount=250000,
        min_tenor=30,
        max_tenor=30,
        interest_rate=0.2,
        fees={"processing_fee": 1000},
        eligibility_rules={},
    )
    kyc = SimpleNamespace(user_id=user.id, bvn_hash="22345678901")
    sim_credit = SimpleNamespace(score=54, recommended_limit=90000)
    db = _FakeDb([[], None, [], [product], kyc, sim_credit])

    response = await loans_routes.loan_eligibility(db=db, user=user)
    body = json.loads(response.body.decode())

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["max_limit"] == 90000
    assert "SIMULATED_CREDIT_PROFILE_USED" in body["data"]["pricing_reason_codes"]
