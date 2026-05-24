"""
services/lending_engine/app/api/v1/routes/admin_products.py
-----------------------------------------------------------
Admin endpoints for managing loan products.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import User, LoanProduct
from shared.auth.deps import get_current_admin
from shared.response import success_response

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])

class UpdateProductPayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    min_tenor: Optional[int] = None
    max_tenor: Optional[int] = None
    interest_rate: Optional[float] = None


def _serialize_product(product: LoanProduct) -> dict:
    return {
        "id": str(product.id),
        "name": product.name,
        "description": product.description,
        "min_amount": product.min_amount,
        "max_amount": product.max_amount,
        "min_tenor": product.min_tenor,
        "max_tenor": product.max_tenor,
        "interest_rate": float(product.interest_rate),
        "is_active": bool(product.is_active),
    }


@router.get("/")
async def list_all_products(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanProduct)
    result = await db.execute(stmt)
    products = result.scalars().all()
    return success_response(data=[_serialize_product(p) for p in products])

@router.post("/")
async def create_product(
    name: str,
    min_amount: int,
    max_amount: int,
    min_tenor: int,
    max_tenor: int,
    interest_rate: float,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from decimal import Decimal
    product = LoanProduct(
        name=name,
        description=description,
        min_amount=min_amount,
        max_amount=max_amount,
        min_tenor=min_tenor,
        max_tenor=max_tenor,
        interest_rate=Decimal(str(interest_rate)),
        is_active=True
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return success_response(data=_serialize_product(product))

@router.patch("/{product_id}/toggle")
async def toggle_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanProduct).where(LoanProduct.id == product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.is_active = not product.is_active
    await db.commit()
    return success_response(data={"id": str(product.id), "is_active": bool(product.is_active)})


@router.patch("/{product_id}")
async def update_product(
    product_id: uuid.UUID,
    payload: UpdateProductPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanProduct).where(LoanProduct.id == product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.name is not None:
        product.name = payload.name
    if payload.description is not None:
        product.description = payload.description
    if payload.min_amount is not None:
        product.min_amount = payload.min_amount
    if payload.max_amount is not None:
        product.max_amount = payload.max_amount
    if payload.min_tenor is not None:
        product.min_tenor = payload.min_tenor
    if payload.max_tenor is not None:
        product.max_tenor = payload.max_tenor
    if payload.interest_rate is not None:
        from decimal import Decimal
        product.interest_rate = Decimal(str(payload.interest_rate))

    await db.commit()
    await db.refresh(product)
    return success_response(data=_serialize_product(product))
