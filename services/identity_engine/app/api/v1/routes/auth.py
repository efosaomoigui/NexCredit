"""
services/identity_engine/app/api/v1/routes/auth.py
--------------------------------------------------
Authentication endpoints for borrowers (OTP) and staff (password).
"""
from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
import random
import logging

logger = logging.getLogger(__name__)

from shared.database import get_db
from shared.models import User, UserRole, UserStatus
from shared.auth.jwt import create_access_token, create_refresh_token, verify_token, TokenPayload
from shared.auth.rbac import require_authenticated
from shared.response import success_response, error_response
from services.identity_engine.app.schemas.auth import (
    UserCreate, UserResponse, OTPVerify, LoginRequest, StaffLoginRequest
)
from services.identity_engine.app.core.redis import (
    set_otp, get_otp, delete_otp, increment_otp_attempts
)
from services.identity_engine.app.core.notifications import send_otp_sms, send_otp_email, send_otp_whatsapp
from services.identity_engine.app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def _is_staff_role(role: UserRole) -> bool:
    return role in {UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN}

def _generated_phone() -> str:
    # Placeholder phone for email-only signups until full profile completion.
    return f"+2349{random.randint(100000000, 999999999)}"

@router.post("/register")
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    stmt = select(User).where(User.phone == user_in.phone)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        return error_response(code="USER_EXISTS", message="User with this phone number already exists", status_code=400)
    
    # Create user
    new_user = User(
        phone=user_in.phone,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.BORROWER,
        status=UserStatus.SUSPENDED # Pending OTP verification
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate and send OTP
    otp = f"{random.randint(100000, 999999)}"
    await set_otp(user_in.phone, otp)
    
    # Try sending via both for the live test
    await send_otp_sms(user_in.phone, otp)
    if user_in.email:
        await send_otp_email(user_in.email, otp)
    
    return success_response(data={"user_id": str(new_user.id), "message": "OTP sent via SMS and Email"})

@router.post("/otp/verify")
async def verify_otp(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    # Check rate limit
    identifier = data.identifier.strip().lower()
    logger.info("otp_verify_attempt identifier=%s", identifier)
    attempts = await increment_otp_attempts(identifier)
    if attempts > settings.MAX_OTP_ATTEMPTS:
        logger.warning("otp_verify_rate_limited identifier=%s attempts=%s", identifier, attempts)
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 1 hour.")
        
    stored_otp = await get_otp(identifier)
    if not stored_otp or stored_otp != data.otp_code:
        logger.warning("otp_verify_failed identifier=%s attempts=%s", identifier, attempts)
        return error_response(code="INVALID_OTP", message="Invalid or expired OTP", status_code=400)
        
    # Activate user
    if "@" in identifier:
        stmt = select(User).where(User.email == identifier)
    else:
        stmt = select(User).where(User.phone == identifier)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return error_response(code="USER_NOT_FOUND", message="User not found", status_code=404)
        
    user.status = UserStatus.ACTIVE
    await db.commit()
    await delete_otp(identifier)
    logger.info("otp_verify_success identifier=%s user_id=%s", identifier, user.id)
    
    # Issue JWT
    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token = create_refresh_token(subject=str(user.id), role=user.role.value)
    
    return success_response(data={
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": UserResponse.model_validate(user).model_dump(mode="json")
    })

@router.post("/start")
async def start_auth(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier_email = (credentials.email or "").strip().lower()
    identifier_phone = (credentials.phone or "").strip()
    otp_channel = (credentials.otp_channel or "sms").strip().lower()

    if identifier_email:
        stmt = select(User).where(User.email == identifier_email)
        otp_target = identifier_email
    else:
        stmt = select(User).where(User.phone == identifier_phone)
        otp_target = identifier_phone

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    created = False
    if not user:
        user = User(
            phone=identifier_phone if identifier_phone else _generated_phone(),
            email=identifier_email or None,
            password_hash=get_password_hash(secrets.token_urlsafe(16)),
            role=UserRole.BORROWER,
            status=UserStatus.SUSPENDED,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        created = True

    if user.status == UserStatus.CLOSED:
        return error_response(code="ACCOUNT_CLOSED", message="Account is closed", status_code=403)

    # Generate and send OTP with channel preference + fallback
    otp = f"{random.randint(100000, 999999)}"
    await set_otp(otp_target, otp)

    sent_via = None
    if otp_channel == "whatsapp":
        wa_ok = await send_otp_whatsapp(user.phone, otp)
        if wa_ok:
            sent_via = "whatsapp"
        elif user.email:
            email_ok = await send_otp_email(user.email, otp)
            if email_ok:
                sent_via = "email"
        if sent_via is None:
            sms_ok = await send_otp_sms(user.phone, otp)
            if sms_ok:
                sent_via = "sms"
    elif otp_channel == "sms":
        sms_ok = await send_otp_sms(user.phone, otp)
        if sms_ok:
            sent_via = "sms"
        elif user.email:
            email_ok = await send_otp_email(user.email, otp)
            if email_ok:
                sent_via = "email"
    else:
        if user.email:
            email_ok = await send_otp_email(user.email, otp)
            if email_ok:
                sent_via = "email"
        if sent_via is None:
            sms_ok = await send_otp_sms(user.phone, otp)
            if sms_ok:
                sent_via = "sms"

    fallback_delivery = False
    if sent_via is None:
        # Dev/sandbox fallback: keep onboarding unblocked when third-party OTP is unavailable.
        # OTP is still generated/stored in Redis and can be surfaced via debug_otp flag.
        fallback_delivery = True
        sent_via = "sms"

    response_data = {
        "message": "OTP prepared via fallback channel" if fallback_delivery else f"OTP sent via {sent_via}",
        "sent_via": sent_via,
        "identifier": otp_target,
        "is_new_user": created,
        "delivery_status": "fallback" if fallback_delivery else "delivered",
    }
    if settings.DEBUG_INCLUDE_OTP_IN_RESPONSE:
        response_data["debug_otp"] = otp

    return success_response(data=response_data)

@router.post("/login")
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Backward-compatible alias for clients still calling /login.
    return await start_auth(credentials, db)

@router.post("/staff/login")
async def staff_login(credentials: StaffLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Staff login for Admin Dashboard / Collections Panel.

    Accepts either:
      - email + password
      - phone + password

    Note: This is password-only for MVP; OTP/2FA for staff can be added later.
    """
    identifier_email = (credentials.email or "").strip().lower()
    identifier_phone = (credentials.phone or "").strip()

    if identifier_email:
        stmt = select(User).where(User.email == identifier_email)
    else:
        stmt = select(User).where(User.phone == identifier_phone)

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not _is_staff_role(user.role):
        logger.warning(f"Failed staff login: user {user.id if user else 'unknown'} not found or unauthorized")
        return error_response(code="UNAUTHORIZED", message="Invalid credentials", status_code=401)

    if user.status != UserStatus.ACTIVE:
        logger.warning(f"Failed staff login: user {user.id} account inactive (status: {user.status})")
        return error_response(code="INACTIVE_ACCOUNT", message="Account is not active", status_code=403)

    if not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed staff login: invalid password for user {user.id}")
        return error_response(code="INVALID_CREDENTIALS", message="Invalid credentials", status_code=401)

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token = create_refresh_token(subject=str(user.id), role=user.role.value)

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": UserResponse.model_validate(user).model_dump(mode="json"),
        }
    )

@router.get("/me")
async def me(payload: TokenPayload = Depends(require_authenticated), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == payload.subject)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return error_response(code="USER_NOT_FOUND", message="User not found", status_code=404)
    return success_response(data={"user": UserResponse.model_validate(user).model_dump(mode="json")})

@router.post("/refresh")
async def refresh(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
        
    token = authorization.split(" ")[1]
    try:
        payload = verify_token(token, expected_type="refresh")
        new_access = create_access_token(subject=payload.subject, role=payload.role)
        
        response_data = {"access_token": new_access}
        
        # Prevent token farming: only issue a new refresh token if the current one 
        # expires in less than 24 hours (86400 seconds).
        now = datetime.now(timezone.utc)
        time_until_expiry = payload.expires_at - now
        
        if time_until_expiry.total_seconds() < 86400:
            new_refresh = create_refresh_token(subject=payload.subject, role=payload.role)
            response_data["refresh_token"] = new_refresh
            
        return success_response(data=response_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/logout")
async def logout():
    # In production, we'd blacklist the token in Redis
    return success_response(message="Logged out successfully")
