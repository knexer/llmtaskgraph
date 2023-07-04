from typing import Sequence


JSON = dict[str, "JSONValue"]
JSONValue = (
    JSON | list["JSONValue"] | Sequence["JSONValue"] | str | int | float | bool | None
)

Prompt = str | dict[str, str] | list[dict[str, str]]


def PromptToJSONValue(
    prompt: Prompt | None,
) -> JSONValue:
    if prompt is None:
        return None
    if isinstance(prompt, str):
        return prompt
    if isinstance(prompt, dict):
        return {k: PromptToJSONValue(v) for k, v in prompt.items()}
    return [PromptToJSONValue(v) for v in prompt]
