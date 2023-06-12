import openai
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
)

from typing import Any, Union


class OpenAiChatApiHandler:
    # todo: support batching
    def __init__(self):
        pass

    @retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(6))
    async def api_call(
        self,
        messages: Union[str, dict[str, str], list[dict[str, str]]],
        params: dict[str, Any],
    ):
        # make sure messages is a list of objects with role and content keys
        if not isinstance(messages, list):
            if isinstance(messages, str):
                messages = {"role": "user", "content": messages}
            messages = [messages]

        # Todo: handle api calls elsewhere for request batching and retries
        response: Any = await openai.ChatCompletion.acreate(
            messages=messages,
            **params,
        )
        # Todo: handle n > 1
        return response.choices[0].message.content
