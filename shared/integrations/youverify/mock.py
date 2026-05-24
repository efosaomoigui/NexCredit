"""
shared/integrations/youverify/mock.py
-------------------------------------
Mock client for Youverify.
"""
import json

class YouverifyMock:
    async def verify_bvn(self, bvn: str):
        with open("shared/mocks/identity_providers.json") as f:
            mocks = json.load(f)
        return mocks["bvn_success"]

    async def verify_nin(self, nin: str):
        with open("shared/mocks/identity_providers.json") as f:
            mocks = json.load(f)
        return mocks["nin_success"]
