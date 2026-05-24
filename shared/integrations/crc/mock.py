"""
shared/integrations/crc/mock.py
-------------------------------
Mock client for CRC.
"""
class CRCMock:
    async def get_report(self, bvn: str):
        return {
            "score": 650,
            "active_loans": 2,
            "delinquencies": 0,
            "total_outstanding": 50000,
            "raw_response": {"provider": "CRC", "data": "full_mock_data"}
        }
