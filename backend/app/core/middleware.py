from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from starlette.responses import JSONResponse

from app.core.errors import error_payload

ASGIMessage = dict[str, Any]
Receive = Callable[[], Awaitable[ASGIMessage]]
Send = Callable[[ASGIMessage], Awaitable[None]]


class RequestBodyTooLarge(Exception):
    pass


class UploadSizeLimitMiddleware:
    """Limit upload request bodies before multipart parsing can spool them."""

    def __init__(self, app: Callable[..., Awaitable[None]], max_size_bytes: int) -> None:
        self.app = app
        self.max_size_bytes = max_size_bytes

    async def __call__(self, scope: ASGIMessage, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"] != "/datasets/upload":
            await self.app(scope, receive, send)
            return

        content_length = next(
            (value for key, value in scope.get("headers", []) if key.lower() == b"content-length"),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > self.max_size_bytes:
                    await self._respond_too_large(scope, receive, send)
                    return
            except ValueError:
                pass

        received_bytes = 0

        async def limited_receive() -> ASGIMessage:
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_size_bytes:
                    raise RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLarge:
            await self._respond_too_large(scope, receive, send)

    async def _respond_too_large(self, scope: ASGIMessage, receive: Receive, send: Send) -> None:
        response = JSONResponse(
            status_code=413,
            content=error_payload(
                "payload_too_large",
                "The upload request body exceeds the configured size limit.",
            ),
        )
        await response(scope, receive, send)
