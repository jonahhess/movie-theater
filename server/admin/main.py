from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from admin.src.auth import validate_admin_authorization_header
from admin.src.database import SessionLocal
from admin.src.router import router as admin_router

admin = FastAPI(title="Admin")


@admin.middleware("http")
async def require_admin_for_non_home(request, call_next):
    # Keep the admin home page public so users can initiate login.
    if request.url.path in {"/admin/", "/admin"}:
        return await call_next(request)

    db = SessionLocal()
    try:
        validate_admin_authorization_header(request.headers.get("Authorization"), db)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    finally:
        db.close()

    return await call_next(request)


admin.include_router(admin_router)
