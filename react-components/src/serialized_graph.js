export const TaskState = {
  COMPLETE: "complete",
  ERROR: "error",
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

  getParentTask(taskId) {
    const allTaskGraphTasks = this.allTasks().filter(
      (t) => t.type === "TaskGraphTask"
    );

    return allTaskGraphTasks.find((g) =>
      g.subgraph.tasks.some((t) => t.task_id === taskId)
    );
  }

  getTaskState(task_id) {
    const task = this.getTask(task_id);
    if (task.output_data !== null) {
      return TaskState.COMPLETE;
    }
    if (task.error !== null) {
      return TaskState.ERROR;
    }
    const deps = this.getDependencies(task_id);
    if (deps.some((dep) => dep.output_data === null)) {
      return TaskState.WAITING;
    }

    const parentTask = getParentTask(task);

    if (parentTask) {
      return parentTask.graph_input === null
        ? TaskState.WAITING
        : TaskState.READY;
    }

    return this.serialized_graph.graph_input === null
      ? TaskState.WAITING
      : TaskState.READY;
  }

  // Returns the transitive dependencies and dependents of the task with the given id.
  getRelatedTaskIds(taskId) {
    const transitiveClosure = (task_id, depsMap) => {
      const deps = new Set();
      const queue = [task_id];
      while (queue.length > 0) {
        const task_id = queue.shift();
        if (!deps.has(task_id)) {
          deps.add(task_id);
          queue.push(...depsMap[task_id]);
        }
      }
      deps.delete(task_id);
      return deps;
    };

    const getRelatedTaskIdsInSubgraph = (subgraph, task_id) => {
      // Find all tasks in subgraph that are relevant to task.
      // First, find all tasks that task transitively depends on.
      const forwardDepsMap = {};
      for (const subgraphTask of subgraph.tasks) {
        forwardDepsMap[subgraphTask.task_id] = this.getDependencies(
          subgraphTask.task_id
        ).map((dep) => dep.task_id);
      }

      // Invert forwardDepsMap to get reverseDepsMap.
      const reverseDepsMap = {};
      for (const task_id of Object.keys(forwardDepsMap)) {
        reverseDepsMap[task_id] = [];
      }
      for (const task_id of Object.keys(forwardDepsMap)) {
        for (const dep of forwardDepsMap[task_id]) {
          reverseDepsMap[dep].push(task_id);
        }
      }

      const dependencies = transitiveClosure(task_id, forwardDepsMap);
      const dependents = transitiveClosure(task_id, reverseDepsMap);
      return new Set([...dependencies, ...dependents]);
    };

    let relatedTaskIds = new Set([taskId]);

    // Find the task's ancestor graphs.
    // Find all related tasks in the task's ancestor graphs.
    const ancestorTaskIds = new Set();
    let subgraphTaskId = taskId;
    for (
      let ancestorTask = this.getParentTask(taskId);
      ancestorTask;
      subgraphTaskId = ancestorTask.task_id,
        ancestorTask = this.getParentTask(ancestorTask.task_id)
    ) {
      ancestorTaskIds.add(ancestorTask.task_id);
      const ancestorGraphRelatedTasks = getRelatedTaskIdsInSubgraph(
        ancestorTask.subgraph,
        subgraphTaskId
      );
      relatedTaskIds = new Set([
        ...relatedTaskIds,
        ...ancestorGraphRelatedTasks,
      ]);
    }
    const rootGraphRelatedTasks = getRelatedTaskIdsInSubgraph(
      this.serialized_graph,
      subgraphTaskId
    );
    relatedTaskIds = new Set([...relatedTaskIds, ...rootGraphRelatedTasks]);

    // Recursively expand any related TaskGraphTasks.
    const addedTasksQueue = [...relatedTaskIds];
    while (addedTasksQueue.length > 0) {
      const task_id = addedTasksQueue.shift();
      const task = this.getTask(task_id);
      if (task.type === "TaskGraphTask") {
        const subtaskIds = task.subgraph.tasks.map((t) => t.task_id);
        relatedTaskIds = new Set([...relatedTaskIds, ...subtaskIds]);
        addedTasksQueue.push(...subtaskIds);
      }
    }

    // Add in the ancestor tasks of taskId.
    return new Set([...relatedTaskIds, ...ancestorTaskIds]);
  }

  onTaskUpdated(task_id, fieldName) {
    // First, update the other task fields to ensure the task is internally consistent.
    const task = this.getTask(task_id);
    if (task.type === "TaskGraphTask") {
      if (fieldName === "graph_input") {
        task.subgraph.graph_input = task.graph_input;
        this.invalidateSubgraph(task.subgraph);
        task.output_data = null;
      } else if (fieldName !== "output_data") {
        throw new Error("Cannot modify TaskGraphTask field " + fieldName);
      }
    } else if (task.type === "LLMTask") {
      if (fieldName === "formatted_prompt") {
        task.output_data = null;
        task.error = null;
        task.response = null;
      } else if (fieldName === "response") {
        task.output_data = null;
        task.error = null;
      } else if (fieldName !== "output_data") {
        throw new Error("Cannot modify LLMTask field " + fieldName);
      }
    } else if (task.type === "PythonTask") {
      if (fieldName !== "output_data") {
        throw new Error("Cannot modify PythonTask field " + fieldName);
      }
      task.error = null;
    }

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
      task.graph_input = null;
      this.invalidateSubgraph(task.subgraph);
    } else if (task.type === "LLMTask") {
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
