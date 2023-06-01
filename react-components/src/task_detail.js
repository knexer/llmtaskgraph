import React from "react";

import TaskField from "./task_field";

const stateLabel = (graph, taskId) => {
  const taskState = graph.getTaskState(taskId);
  return (
    <b className={`state-label__${taskState.toLowerCase()}`}>{taskState}</b>
  );
};

export default function TaskDetail({ graph, taskId, onEdit }) {
  if (taskId === null) {
    return <GraphDetail graph={graph} onEdit={onEdit} />;
  }

  const task = graph.getTask(taskId);
  const type = task.type;

  return (
    <div className="task-detail">
      <header className="task-detail-header">
        {type} Detail ({stateLabel(graph, task.task_id)})
      </header>
      <div className="task-detail-content">
        {task.error !== null ? <div>Error: {task.error}</div> : null}
        <div>Task ID: {task.task_id}</div>
        {type === "LLMTask" ? (
          <LLMTaskDetail task={task} onEdit={onEdit} />
        ) : null}
        {type === "PythonTask" ? (
          <PythonTaskDetail task={task} onEdit={onEdit} />
        ) : null}
        {type === "TaskGraphTask" ? (
          <TaskGraphTaskDetail task={task} onEdit={onEdit} />
        ) : null}
      </div>
    </div>
  );
}

export function GraphDetail({ graph, onEdit }) {
  return (
    <div className="task-detail">
      <header className="task-detail-header">
        Graph Detail ({stateLabel(graph, graph.graphData.output_task)})
      </header>
      <div className="task-detail-content">
        <TaskField
          task={graph.graphData}
          computedBy={"user input"}
          fieldName="graph_input"
          onEdit={onEdit}
        />
        {graph.graphData.output_task && (
          <TaskField
            task={graph.getTask(graph.graphData.output_task)}
            fieldName="output_data"
            computedBy={"output task " + graph.graphData.output_task}
            onEdit={onEdit}
          />
        )}
      </div>
    </div>
  );
}

export function LLMTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="formatted_prompt"
        computedBy={task.prompt_formatter_id}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="response"
        computedBy={"LLM with params " + JSON.stringify(task.params)}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={task.output_parser_id}
        onEdit={onEdit}
      />
    </>
  );
}

export function PythonTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={task.callback_id}
        onEdit={onEdit}
      />
    </>
  );
}

export function TaskGraphTaskDetail({ task, onEdit }) {
  return (
    <>
      <TaskField
        task={task}
        fieldName="graph_input"
        computedBy={task.input_formatter_id}
        onEdit={onEdit}
      />
      <TaskField
        task={task}
        fieldName="output_data"
        computedBy={"output task " + task.subgraph.output_task}
        onEdit={onEdit}
      />
    </>
  );
}
