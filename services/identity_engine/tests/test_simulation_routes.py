import json
import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest

module_path = Path(__file__).resolve().parents[1] / "app" / "api" / "v1" / "routes" / "simulation.py"
spec = importlib.util.spec_from_file_location("sim_routes_module", module_path)
sim_routes = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(sim_routes)


class _ScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeDb:
    def __init__(self, execute_results):
        self._execute_results = list(execute_results)

    async def execute(self, _stmt):
        if not self._execute_results:
            raise AssertionError("Unexpected query execution order")
        return _ScalarResult(self._execute_results.pop(0))


@pytest.mark.asyncio
async def test_sim_bvn_verify_success():
    row = SimpleNamespace(bvn="22345678901", first_name="Ada", last_name="Okafor", phone="+2348091110001", dob=None)
    db = _FakeDb([row])
    request = SimpleNamespace(headers={"X-Trace-Id": "t1"})

    response = await sim_routes.sim_verify_bvn(payload={"bvn": "22345678901"}, request=request, db=db)
    body = json.loads(response.body.decode())

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["first_name"] == "Ada"


@pytest.mark.asyncio
async def test_sim_credit_score_not_found():
    db = _FakeDb([None])
    request = SimpleNamespace(headers={"X-Trace-Id": "t2"})

    response = await sim_routes.sim_credit_score(payload={"bvn": "22345678901"}, request=request, db=db)
    body = json.loads(response.body.decode())

    assert response.status_code == 404
    assert body["success"] is False
    assert body["error"]["code"] == "CREDIT_PROFILE_NOT_FOUND"


@pytest.mark.asyncio
async def test_sim_bank_lookup_success():
    row = SimpleNamespace(
        bank_code="044",
        bank_name="Access Bank",
        account_number="0123456789",
        account_name="Ada Okafor",
        bvn="22345678901",
    )
    db = _FakeDb([row])
    request = SimpleNamespace(headers={"X-Trace-Id": "t3"})

    response = await sim_routes.sim_bank_lookup(
        payload={"bank_code": "044", "account_number": "0123456789"}, request=request, db=db
    )
    body = json.loads(response.body.decode())

    assert response.status_code == 200
    assert body["success"] is True
    assert body["data"]["account_name"] == "Ada Okafor"
