import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import "../index.css";

function LLMTaskSummary(task, task_state) {
  return (
    <>
      <div>LLMTask ({task_state})</div>
      <div>{task.prompt_formatter_id}</div>
      <div>{task.output_parser_id}</div>
    </>
  );
}

function PythonTaskSummary(task, task_state) {
  return (
    <>
      <div>PythonTask ({task_state})</div>
      <div>{task.callback_id}</div>
    </>
  );
}

function TaskGraphTaskSummary(task, task_state) {
  return (
    <>
      <div>TaskGraphTask ({task_state})</div>
      <div>{task.input_formatter_id}</div>
    </>
  );
}

function TaskSummary(task, task_state) {
  switch (task.type) {
    case "LLMTask":
      return LLMTaskSummary(task, task_state);
    case "PythonTask":
      return PythonTaskSummary(task, task_state);
    case "TaskGraphTask":
      return TaskGraphTaskSummary(task, task_state);
    default:
      return (
        <div>
          Unknown task type: {task.type} ({task_state})
        </div>
      );
  }
}

export function TaskNode({ data }) {
  const task = data.task;
  const graph = data.graph;
  const direction = data.direction;
  const selection_state = data.selection_state || "related";
  const isHorizontal = direction === "LR";

  // TODO can this be pulled from a css class?
  const handleStyle = selection_state === "unrelated" ? { opacity: 0.2 } : {};
  const taskCreationHandleStyle = isHorizontal ? { top: 10 } : { left: 10 };

  // Show the basic task info. Connectivity info is shown by edges. The details view will show the rest.
  const task_state = graph.getTaskState(task.task_id);
  return (
    <>
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        style={handleStyle}
      />
      <div
        className={`task-node__${task_state} react-flow__node-default task-node__${selection_state}`}
        style={
          task.type === "TaskGraphTask"
            ? {
                width: data.width,
                height: data.height,
                backgroundColor: "transparent",
              }
            : null
        }
      >
        {TaskSummary(task, task_state)}
      </div>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        style={handleStyle}
        id="output"
      />
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="handle__${selection_state}"
        id="task creation"
        style={{ ...handleStyle, ...taskCreationHandleStyle }}
      />
    </>
  );
}
