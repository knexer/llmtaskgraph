import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";

function LLMTaskSummary( task ) {
  return (
    <>
      <div>LLMTask</div>
      <div>{task.prompt_formatter_id}</div>
      <div>{task.output_parser_id}</div>
    </>
  );
}


function PythonTaskSummary( task ) {
  return (
    <>
      <div>PythonTask</div>
      <div>{task.callback_id}</div>
    </>
  );
}

function TaskGraphTaskSummary( task ) {
  return (
    <>
      <div>TaskGraphTask</div>
      <div>{task.input_formatter_id}</div>
    </>
  );
}

function TaskSummary(task){
  switch (task.type) {
    case "LLMTask":
      return LLMTaskSummary(task);
    case "PythonTask":
      return PythonTaskSummary(task);
    case "TaskGraphTask":
      return TaskGraphTaskSummary(task);
    default:
      return <div>Unknown task type: {task.type}</div>;
  };

}

export function TaskNode({data}) {
  const task = data.task;
  const direction = data.direction;
  const isHorizontal = direction === "LR";
  const handleStyle = isHorizontal ? { top: 10 } : { left: 10 };
  // Show the basic task info. Connectivity info is shown by edges. The details view will show the rest.
  return (
    <>
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
      />
      <div className="react-flow__node-default custom-node" style={task.type === "TaskGraphTask" ? {width: data.width, height: data.height, backgroundColor: "transparent"} : null}>
        {TaskSummary(task)}
      </div>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="output"
      />
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        id="task creation"
        style={handleStyle}
      />
    </>
  );
}
