JSON = dict[str, "JSONValue"]
JSONValue = JSON | list["JSONValue"] | str | int | float | bool | None
