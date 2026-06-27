import logging
import os
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from google import genai

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL = "gemini-3.1-flash-lite"

_client = None


def _get_client():
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não configurada")
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


async def generate_text(
    system_prompt: str,
    user_text: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 8192,
    temperature: float = 0.3,
) -> str:
    client = _get_client().aio
    interaction = await client.interactions.create(
        model=model,
        input=user_text,
        system_instruction=system_prompt,
        generation_config={
            "max_output_tokens": max_tokens,
            "temperature": temperature,
        },
    )
    return interaction.output_text


async def generate_text_stream(
    system_prompt: str,
    user_text: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.5,
    previous_interaction_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    client = _get_client().aio
    kwargs = dict(
        model=model,
        input=user_text,
        system_instruction=system_prompt,
        generation_config={
            "temperature": temperature,
        },
        stream=True,
    )
    if previous_interaction_id:
        kwargs["previous_interaction_id"] = previous_interaction_id

    stream = await client.interactions.create(**kwargs)
    async for event in stream:
        if event.event_type == "step.delta":
            if event.delta.type == "text":
                yield event.delta.text
