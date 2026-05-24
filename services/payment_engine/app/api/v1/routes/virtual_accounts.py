"""
services/payment_engine/app/api/v1/routes/virtual_accounts.py
-------------------------------------------------------------
Borrower virtual account management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import User, BankAccount
from shared.auth.deps import get_current_user
from shared.response import success_response
from services.payment_engine.app.services.virtual_accounts import VirtualAccountService

router = APIRouter(prefix="/virtual-accounts", tags=["Virtual Accounts"])

@router.get("/")
async def get_my_virtual_account(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.bank_name == "Monnify Virtual")
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()
    
    if not account:
        # Provision on the fly if missing
        account = await VirtualAccountService.provision_virtual_account(db, user.id)
        
    return success_response(data=account)
