import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("platziflix")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={duration_ms}ms "
            f"request_id={request_id}"
        )
        return response
