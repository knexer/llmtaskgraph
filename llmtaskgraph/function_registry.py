import json
from typing import Any, Callable

from .api_handler import OpenAiChatApiHandler

_api_handler = OpenAiChatApiHandler()

base_function_registry: dict[str, Callable[..., Any]] = {
    "openai_chat": _api_handler.api_call,
    "identity": lambda context, x: x,
    "parse_json": lambda context, x: json.loads(x),
    "forward_graph_input": lambda context: context.graph_input(),
}

make_base_function_registry = lambda: base_function_registry.copy()
