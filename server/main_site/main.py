
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError

from admin.main import admin
from main_site.src.database import get_read_db
from main_site.src.router import router
from tickets.main import tickets

app = FastAPI(title="Main Root Application")
db_dependency = Depends(get_read_db)


def _is_schema_missing_db_error(exc: DBAPIError) -> bool:
	details = str(getattr(exc, "orig", exc)).lower()
	schema_missing_markers = ("no such table", "doesn't exist", "unknown table", "1146")
	return any(marker in details for marker in schema_missing_markers)


@app.exception_handler(DBAPIError)
async def handle_db_errors(_: Request, exc: DBAPIError):
	if _is_schema_missing_db_error(exc):
		return JSONResponse(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			content={"detail": "Database schema is not ready yet. Please try again later."},
		)

	return JSONResponse(
		status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
		content={"detail": "Database query failed."},
	)


@app.exception_handler(RequestValidationError)
async def handle_validation_errors(_: Request, exc: RequestValidationError):
	return JSONResponse(
		status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
		content={"detail": exc.errors()},
	)


@app.exception_handler(HTTPException)
async def handle_http_exceptions(_: Request, exc: HTTPException):
	return JSONResponse(
		status_code=exc.status_code,
		content={"detail": exc.detail},
		headers=exc.headers,
	)


@app.exception_handler(Exception)
async def handle_unexpected_errors(_: Request, __: Exception):
	return JSONResponse(
		status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
		content={"detail": "Internal server error."},
	)

app.include_router(router)

# Mount the sub-apps (their internal routes use their own database.py files)
app.mount("/admin", admin)
app.mount("/tickets", tickets)
