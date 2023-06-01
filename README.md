# llmtaskgraph

A Python library and set of React components useful for debugging programs that use LLMs iteratively.

## Motivation

There are two (compounding) problems I keep running into as I prototype with LLMs:
1. They are slow. Rapid iteration on programs that use LLMs iteratively is difficult.
2. They are inconsistent. Redundancy and feedback loops are often necessary to detect and contain unexpected responses. The long tail of LLM-behavior-induced bugs are difficult to predict, reproduce, and fix.

## Key Features

llmtaskgraph asks you to explicitly model your LLM-using application as an acyclic graph of tasks with declared dependencies and information flow. It's a bit of a pain in the ass, but in return, you get:

- Execution tracing, so the causes and effects of a bad LLM response can be traced backward and forward throughout an execution.
- Easy exploration of 'what if?' scenarios - modify an execution trace, deserialize it back into a task graph, and run it again.
- Automatic concurrency, so you waste a little bit less time waiting.
- Resume an execution trace to get directly to the part of the program you're iterating on right now, so you waste a lot less time waiting!

## Components

llmtaskgraph is composed of three pieces:
- llmtaskgraph is a Python library for constructing, executing, serializing and deserializing task graphs.
- react-components is a set of React components for viewing and editing execution traces.
- example_app links the two over a localhost websocket, forming a simple self-contained debugging application.

These components could be recombined in other ways, e.g. to form a bug reporting workflow, a tracing solution for a service, or (soon) a visual programming environment.

## Usage

The most basic usage of llmtaskgraph (implemented in example_app) looks like this:

1. Construct a TaskGraph in Python (or load a serialized one from elsewhere).
2. Run it - this produces an execution trace stored within the TaskGraph.
3. Serialize it to JSON.
4. Use the React components to visualize, inspect and modify the serialized execution trace in a web frontend.
5. Back in Python-land, deserialize the modified trace into a new TaskGraph.
6. Repeat from step 2.

## Roadmap

- Support for non-OpenAI LLMs
- Usability improvements to the TaskGraph and Task creation APIs
- More flexible modification of an execution trace in the web frontend (would enable a visual programming workflow)
- Javascript backend for all-in-one web applications

## Contributing

This is a hobby project, and I'm not sure where I want to take it yet. I'm open to a lot of things, but reach out first.

If you try out llmtaskgraph, please file an issue with your feedback and thoughts!

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

