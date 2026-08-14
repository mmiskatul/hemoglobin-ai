import os
import logging
import jwt
from datetime import datetime, timezone, timedelta
from core.config import get_ai_settings

logger = logging.getLogger("auth")


def create_jwt_token(user_id: int, email: str, role: str = "Donor") -> str:
    """
    Encodes and signs an authentic PyJWT HS256 authentication token.
    Claims include: sub, user_id, email, role, iat, exp.
    """
    settings = get_ai_settings()
    secret = settings.jwt_secret or os.getenv("JWT_SECRET", "super_secret_jwt_key_smart_blood_hub_2026_auth_token")
    algorithm = settings.jwt_algorithm or os.getenv("JWT_ALGORITHM", "HS256")
    hours = settings.jwt_expiration_hours or int(os.getenv("JWT_EXPIRATION_HOURS", 24))

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email.lower().strip(),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=hours),
    }

    token = jwt.encode(payload, secret, algorithm=algorithm)
    logger.info(f"Generated PyJWT token for user {email} (User ID: {user_id})")
    return token


def decode_jwt_token(token: str) -> dict:
    """
    Decodes and verifies a PyJWT token string.
    Raises Exception if token is invalid or expired.
    """
    settings = get_ai_settings()
    secret = settings.jwt_secret or os.getenv("JWT_SECRET", "super_secret_jwt_key_smart_blood_hub_2026_auth_token")
    algorithm = settings.jwt_algorithm or os.getenv("JWT_ALGORITHM", "HS256")

    try:
        decoded = jwt.decode(token, secret, algorithms=[algorithm])
        return decoded
    except jwt.ExpiredSignatureError:
        raise ValueError("JWT token has expired")
    except jwt.InvalidTokenError as err:
        raise ValueError(f"Invalid JWT token: {err}")


# Alias for backward compatibility
verify_jwt_token = decode_jwt_token
