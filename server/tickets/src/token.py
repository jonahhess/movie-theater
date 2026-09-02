from fastapi import Header, HTTPException, status
from hmac import compare_digest
import os

INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")

def require_internal_service(
    x_internal_service_token: str | None = Header(default=None),
) -> None:
    if not INTERNAL_SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal service token is not configured",
        )

    if not x_internal_service_token or not compare_digest(
        x_internal_service_token,
        INTERNAL_SERVICE_TOKEN,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")