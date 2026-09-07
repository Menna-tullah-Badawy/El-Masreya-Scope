from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import RegisterIn, LoginIn, TokenOut, UserOut, UserUpdateIn
from ..security import (
    hash_password, verify_password, create_access_token, get_current_user,
)
from ..serializers import user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "هذا البريد مسجل بالفعل / Email already registered")
    user = User(
        name=payload.name.strip(),
        email=email,
        phone=(payload.phone or "").strip(),
        password_hash=hash_password(payload.password),
        role=UserRole.customer,
        organization=(payload.organization or "").strip(),
        city=(payload.city or "").strip(),
        address=(payload.address or "").strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user), "token_type": "bearer",
            "user": user_out(user)}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "بيانات الدخول غير صحيحة / Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "الحساب موقوف / Account disabled")
    return {"access_token": create_access_token(user), "token_type": "bearer",
            "user": user_out(user)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdateIn, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    data.pop("password", None)
    for k, v in data.items():
        if v is not None:
            setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user_out(user)
