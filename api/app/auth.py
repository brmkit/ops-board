import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# Placeholder shipped in docker-compose.yml — must never be used as a real secret.
_PLACEHOLDER_SECRET = "changeme-set-in-env"


def _resolve_secret() -> str:
    """Return the JWT signing secret.

    Prefers OPSBOARD_SECRET. If it is unset or still the compose placeholder,
    fall back to a persistent random secret stored in the data dir so the
    quick-start works out of the box without a weak, guessable key. Tokens
    survive restarts because the generated secret is written to disk.
    """
    env_secret = os.environ.get("OPSBOARD_SECRET", "").strip()
    if env_secret and env_secret != _PLACEHOLDER_SECRET:
        return env_secret

    data_dir = Path(os.environ.get("OPS_BOARD_DATA_DIR", "./data"))
    secret_file = data_dir / ".secret"
    if secret_file.exists():
        return secret_file.read_text().strip()

    data_dir.mkdir(parents=True, exist_ok=True)
    generated = secrets.token_urlsafe(48)
    secret_file.write_text(generated)
    try:
        secret_file.chmod(0o600)
    except OSError:
        pass
    print(
        f"WARNING: OPSBOARD_SECRET not set (or left as the placeholder); "
        f"generated a persistent secret at {secret_file}. "
        f"Set OPSBOARD_SECRET explicitly for production deployments.",
        file=sys.stderr,
    )
    return generated


SECRET = _resolve_secret()
ALGORITHM = "HS256"
EXPIRE_HOURS = int(os.environ.get("OPSBOARD_TOKEN_HOURS", "8"))

_bearer = HTTPBearer()


class _Pwd:
    """Minimal bcrypt password hasher, replacing passlib's CryptContext.

    Kept as a tiny object exposing .hash()/.verify() so existing call sites
    (main, auth router, users router) are untouched. bcrypt rejects passwords
    longer than 72 bytes, so we truncate to match passlib's historical
    behavior; hashes stay the standard $2b$ format, so credentials created
    under passlib still verify.
    """

    @staticmethod
    def hash(password: str) -> str:
        pw = password.encode("utf-8")[:72]
        return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify(password: str, hashed: str) -> bool:
        pw = password.encode("utf-8")[:72]
        try:
            return bcrypt.checkpw(pw, hashed.encode("utf-8"))
        except ValueError:
            return False


_pwd = _Pwd()


def create_token(user_id: str, username: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "username": username, "role": role, "exp": exp},
        SECRET,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    payload = decode_token(creds.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired token",
        )
    return {"id": payload["sub"], "username": payload["username"], "role": payload.get("role", "user")}


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="admin required")
    return user
