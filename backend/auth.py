
import os
import uuid
from functools import lru_cache

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

security = HTTPBearer()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
ISSUER = f"{SUPABASE_URL}/auth/v1"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"


@lru_cache
def jwks_client():
    return jwt.PyJWKClient(JWKS_URL)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    try:
        token = credentials.credentials

        key = jwks_client().get_signing_key_from_jwt(token)

        claims = jwt.decode(
            token,
            key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=ISSUER,
            options={
                "require": ["sub", "exp", "iss", "aud"]
            }
        )

        if claims.get("role") != "authenticated":
            raise ValueError("Invalid role")

        return str(uuid.UUID(claims["sub"]))

    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token"
        ) from exc
