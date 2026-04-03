from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str = ""):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=f"{resource}{f' \'{identifier}\'' if identifier else ''} no encontrado",
            status_code=404,
        )


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(code="CONFLICT", message=message, status_code=409)


class ForbiddenError(AppException):
    def __init__(self, message: str = "No tienes permisos para esta accion"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "No autenticado"):
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class PaymentRequiredError(AppException):
    def __init__(self, message: str = "Se requiere una suscripcion activa"):
        super().__init__(code="PAYMENT_REQUIRED", message=message, status_code=402)


class ValidationError(AppException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
            details=details,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )
