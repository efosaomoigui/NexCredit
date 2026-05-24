"""
services/payment_engine/app/services/virtual_accounts.py
--------------------------------------------------------
Virtual account provisioning via Monnify.
"""
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import BankAccount, User, BorrowerProfile

class VirtualAccountService:
    @staticmethod
    async def provision_virtual_account(session: AsyncSession, user_id: uuid.UUID) -> Optional[BankAccount]:
        """
        Provisions a dedicated virtual account for the borrower.
        """
        # 1. Check if already exists
        stmt = select(BankAccount).where(BankAccount.user_id == user_id, BankAccount.bank_name == "Monnify Virtual")
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
            return None
            
        # 2. Fetch Borrower Name
        stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == user_id)
        res = await session.execute(stmt)
        profile = res.scalar_one_or_none()
        account_name = profile.full_name if profile else "NexCredit Borrower"
        
        # 3. Provision via Stellas (Primary) with Monnify (Fallback)
        from shared.integrations.factory import IntegrationFactory
        import logging
        logger = logging.getLogger(__name__)
        
        # Get phone number from User model
        user_stmt = select(User).where(User.id == user_id)
        user_res = await session.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        phone = user.phone if user else "0000000000"
        
        try:
            stellas = IntegrationFactory.get_stellas()
            # Stellas typically returns dict with accountNumber and bankName
            resp = await stellas.create_virtual_account(str(user_id), account_name, phone)
            account_number = resp.get("accountNumber", f"99{uuid.uuid4().int % 10**8:08d}")
            bank_name = "Stellas Virtual"
        except Exception as e:
            logger.warning(f"Stellas VA creation failed for user {user_id}: {str(e)}. Falling back to Monnify.")
            try:
                monnify = IntegrationFactory.get_monnify()
                resp = await monnify.create_virtual_account(str(user_id), account_name)
                # Monnify returns a list of accounts or single account
                if isinstance(resp.get("accounts"), list) and len(resp["accounts"]) > 0:
                    account_number = resp["accounts"][0].get("accountNumber", f"88{uuid.uuid4().int % 10**8:08d}")
                    bank_name = resp["accounts"][0].get("bankName", "Monnify Virtual")
                else:
                    account_number = resp.get("accountNumber", f"88{uuid.uuid4().int % 10**8:08d}")
                    bank_name = "Monnify Virtual"
            except Exception as inner_e:
                logger.error(f"Monnify fallback also failed for user {user_id}: {str(inner_e)}.")
                raise RuntimeError("Failed to provision virtual account from all providers.")
        
        # 4. Store in DB
        v_account = BankAccount(
            user_id=user_id,
            account_number=account_number,
            account_number_hash=hash(account_number),
            bank_name=bank_name,
            account_name=account_name,
            verified=True,
            is_primary=False
        )
        session.add(v_account)
        await session.commit()
        
        return v_account
