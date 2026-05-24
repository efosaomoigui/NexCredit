"""
Tests for shared/response.py — Standard API response envelope.
"""
from fastapi.responses import JSONResponse

from shared.response import (
    created_response,
    error_response,
    forbidden_response,
    internal_error_response,
    not_found_response,
    success_response,
    unauthorized_response,
    validation_error_response,
)


class TestSuccessResponse:
    def test_basic_success(self):
        resp = success_response(data={"id": "abc"})
        assert isinstance(resp, JSONResponse)
        assert resp.status_code == 200

    def test_success_body(self):
        resp = success_response(data={"key": "value"}, message="Done")
        import json
        body = json.loads(resp.body)
        assert body["success"] is True
        assert body["data"]["key"] == "value"
        assert body["message"] == "Done"

    def test_success_with_meta(self):
        resp = success_response(data=[], meta={"page": 1, "total": 0})
        import json
        body = json.loads(resp.body)
        assert body["meta"]["page"] == 1

    def test_created_returns_201(self):
        resp = created_response(data={"id": "new-uuid"})
        assert resp.status_code == 201


class TestErrorResponse:
    def test_error_body(self):
        import json
        resp = error_response(code="SOME_ERROR", message="Something went wrong")
        body = json.loads(resp.body)
        assert body["success"] is False
        assert body["error"]["code"] == "SOME_ERROR"
        assert body["error"]["field"] is None

    def test_error_with_field(self):
        import json
        resp = validation_error_response(field="phone", message="Invalid format")
        body = json.loads(resp.body)
        assert body["error"]["field"] == "phone"
        assert resp.status_code == 422

    def test_not_found(self):
        resp = not_found_response("Borrower")
        assert resp.status_code == 404

    def test_unauthorized(self):
        resp = unauthorized_response()
        assert resp.status_code == 401

    def test_forbidden(self):
        resp = forbidden_response()
        assert resp.status_code == 403

    def test_internal_error(self):
        resp = internal_error_response()
        assert resp.status_code == 500
