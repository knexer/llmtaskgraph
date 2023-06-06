import asyncio
import random

import openai

from typing import Any


# define a retry decorator
# adapted from https://platform.openai.com/docs/guides/rate-limits/error-mitigation
def retry_with_exponential_backoff(
    func,
    initial_delay: float = 1,
    exponential_base: float = 2,
    jitter: bool = True,
    max_retries: int = 10,
    errors: tuple = (openai.error.RateLimitError,),
):
    """Retry a function with exponential backoff."""

    async def wrapper(*args, **kwargs):
        num_retries = 0
        delay = initial_delay

        # Loop until a successful response or max_retries is hit or an exception is raised
        while True:
            try:
                return await func(*args, **kwargs)

            # Retry on specific errors
            except errors as e:
                print("rate limit happened")
                # Increment retries
                num_retries += 1

                # Check if max retries has been reached
                if num_retries > max_retries:
                    raise Exception(
                        f"Maximum number of retries ({max_retries}) exceeded."
                    )

                # Wait for the delay
                await asyncio.sleep(delay)

                # Increment the delay
                delay *= exponential_base * (1 + jitter * random.random())

            # Raise exceptions for any errors not specified
            except Exception as e:
                raise e

    return wrapper


class OpenAiChatApiHandler:
    # todo: support batching
    def __init__(self):
        pass

    @retry_with_exponential_backoff
    async def api_call(self, messages, params):
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
