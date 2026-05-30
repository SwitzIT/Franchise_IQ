"""
Chat endpoint — streams Claude responses via SSE.
POST /api/chat
Body: { "session_id": str, "message": str, "history": [{role, content}] }
"""
import json
import os
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.session_store import session_exists
from app.services.chat_context_service import build_chat_context
from app.utils import get_logger

log = get_logger("routes.chat")
router = APIRouter(tags=["Chat"])

SYSTEM_PROMPT_TEMPLATE = """You are FranchiseIQ Assistant, an expert in franchise location analytics and spatial business intelligence. You have full access to the current analysis results.

CURRENT ANALYSIS CONTEXT:
{context_json}

Your role:
- Answer questions about the franchise location analysis, candidate scores, and regional performance.
- Explain why certain locations scored higher than others.
- Highlight risks (low confidence intervals, high cannibalization scores, poor demographic fit).
- Suggest follow-up actions (visit top candidate, investigate underperforming region).
- Keep answers concise (3-5 sentences unless detail is requested).
- Format numbers as currency or percentages where appropriate.
- If asked something outside the scope of the analysis data, say so clearly.
- Never make up data; only reference what is in the context above."""


class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[HistoryMessage] = []


@router.post("/chat")
async def chat(body: ChatRequest):
    """Stream a Claude response for the given message + conversation history."""
    if not session_exists(body.session_id):
        raise HTTPException(404, "Session not found.")

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY is not configured on the server.")

    # Build dynamic context
    context = build_chat_context(body.session_id)
    context_json = json.dumps(context, indent=2, ensure_ascii=False, default=str)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context_json=context_json)

    # Build Anthropic messages list
    messages = [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            with client.messages.stream(
                model="claude-sonnet-4-5",
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    yield f"data: {json.dumps(text_chunk)}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            log.exception(f"[Chat] Streaming error: {e}")
            error_payload = json.dumps({"error": str(e)})
            yield f"data: {error_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
