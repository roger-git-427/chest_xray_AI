"""Create or update the first Master account from environment variables."""

from __future__ import annotations

import os

from sqlalchemy import select

from api.database import SessionLocal
from api.models import User, UserRole
from api.security import hash_password


def main() -> None:
    email = os.getenv("BYTEAI_MASTER_EMAIL", "").strip().lower()
    password = os.getenv("BYTEAI_MASTER_PASSWORD", "")
    name = os.getenv("BYTEAI_MASTER_NAME", "ByteAI Master").strip()
    if not email or not password:
        raise SystemExit(
            "Set BYTEAI_MASTER_EMAIL and BYTEAI_MASTER_PASSWORD first."
        )

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                full_name=name,
                password_hash=hash_password(password),
                role=UserRole.MASTER,
                active=True,
            )
            db.add(user)
            action = "created"
        else:
            user.full_name = name
            user.password_hash = hash_password(password)
            user.role = UserRole.MASTER
            user.active = True
            action = "updated"
        db.commit()
    print(f"Master account {action}: {email}")


if __name__ == "__main__":
    main()
