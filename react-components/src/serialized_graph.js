export const TaskState = {
  COMPLETE: "complete",
  READY: "ready",
  WAITING: "waiting",
};

export default class SerializedGraph {
  constructor(serialized_graph) {
    this.serialized_graph = serialized_graph;
  }

  copy() {
    return new SerializedGraph(
      JSON.parse(JSON.stringify(this.serialized_graph))
    );
  }

  // Returns a list of all tasks in the graph.
  allTasks() {
    function allTasksImpl(graph) {
      return graph.tasks.flatMap((task) =>
        [task].concat(
          task.type === "TaskGraphTask" ? allTasksImpl(task.subgraph) : []
        )
      );
    }
    return allTasksImpl(this.serialized_graph);
  }

  // Returns the task with the given id.
  getTask(task_id) {
    return this.allTasks().find((task) => task.task_id === task_id);
  }

  // Returns the dependencies of the task with the given id.
  getDependencies(task_id) {
    const task = this.getTask(task_id);
    const deps = task.deps.map((dep) => this.getTask(dep));
    const kwdeps = Object.values(task.kwdeps).map((dep) => this.getTask(dep));
    const created_by = task.created_by ? [this.getTask(task.created_by)] : [];
    return deps.concat(kwdeps).concat(created_by);
  }

  getTaskState(task_id) {
    const task = this.getTask(task_id);
    if (task.output_data !== null) {
      return TaskState.COMPLETE;
    }
    const deps = this.getDependencies(task_id);
    if (deps.some((dep) => dep.output_data === null)) {
      return TaskState.WAITING;
    }
    return TaskState.READY;
  }

  onTaskUpdated(task_id) {
    this.onTaskUpdatedInSubgraph(task_id, this.serialized_graph);
  }

  // Searches the given subgraph for task_id, and invalidates tasks that depend
  // on it. Returns true if subgraph's output_data was invalidated.
  onTaskUpdatedInSubgraph(task_id, subgraph) {
    // Scan subgraph in topological order for tasks invalidated by this update.
    // Recurse into subgraphs as we go, searching for task_id.
    const updated = new Set([task_id]);
    const toDelete = new Set();
    for (const task of subgraph.tasks) {
      // If any of the task's dependencies were updated, invalidate the task.
      if (
        task.deps.some((dep) => updated.has(dep)) ||
        Object.values(task.kwdeps).some((dep) => updated.has(dep))
      ) {
        this.invalidateTask(task);
        updated.add(task.task_id);
      } else if (task.type === "TaskGraphTask") {
        // Otherwise, if the task is a subgraph, it may contain task_id.
        if (this.onTaskUpdatedInSubgraph(task_id, task.subgraph)) {
          task.output_data = null;
          updated.add(task.task_id);
        }
      }
      // If the task was created by an invalidated task, delete it.
      if (
        task.created_by !== null &&
        updated.has(task.created_by) &&
        this.getTaskState(task.created_by) !== TaskState.COMPLETE
      ) {
        updated.add(task.task_id);
        toDelete.add(task.task_id);
      }
    }

    for (task_id of toDelete) {
      this.deleteTask(task_id);
    }

    // If task_id was in the subgraph (directly or transitively), output_task would have been invalidated.
    // In this case, return true to indicate that the subgraph was invalidated.
    return updated.has(subgraph.output_task);
  }

  invalidateSubgraph(subgraph) {
    for (const task of subgraph.tasks) {
      this.invalidateTask(task);
    }
  }

  invalidateTask(task) {
    task.output_data = null;
    if (task.type === "TaskGraphTask") {
      console.log("Invalidating subgraph");
      this.invalidateSubgraph(task.subgraph);
    } else if (task.type === "LLMTask") {
      console.log("Invalidating LLM task");
      task.formatted_prompt = null;
      task.response = null;
    }
  }

  deleteTask(task_id) {
    // Find the subgraph that contains the task.
    // Delete the task from the subgraph.
    const all_tasks = this.allTasks();
    const parent_task = all_tasks.find(
      (task) =>
        task.type === "TaskGraphTask" &&
        task.subgraph.tasks.some((t) => t.task_id === task_id)
    );

    if (parent_task) {
      parent_task.subgraph.tasks = parent_task.subgraph.tasks.filter(
        (t) => t.task_id !== task_id
      );
    } else {
      this.serialized_graph.tasks = this.serialized_graph.tasks.filter(
        (t) => t.task_id !== task_id
      );
    }
  }
}
