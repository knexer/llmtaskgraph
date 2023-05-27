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

  // Invalidates the output of the task with the given id.
  invalidateTask(task_id) {
    const task = this.getTask(task_id);
    task.output = null;

    // TODO: Invalidate the output of all tasks that depend on this task, directly or transitively.
  }
}
