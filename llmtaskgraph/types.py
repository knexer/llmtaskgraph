from typing import Sequence


JSON = dict[str, "JSONValue"]
JSONValue = (
    JSON | list["JSONValue"] | Sequence["JSONValue"] | str | int | float | bool | None
)
