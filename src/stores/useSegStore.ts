// src/stores/useSegStore.ts
import { defineStore } from "pinia";
import type { PomodoroSegment, TodoSegment } from "@/core/types/Block";
import { Todo } from "@/core/types/Todo";
import { reallocateAllTodos } from "@/services/pomoSegService";

export const useSegStore = defineStore("seg", {
  state: () => ({
    pomodoroSegments: [] as PomodoroSegment[],
    todoSegments: [] as TodoSegment[],
  }),
  actions: {
    setPomodoroSegments(segments: PomodoroSegment[]) {
      this.pomodoroSegments = segments;
    },
    addTodoSegment(segment: TodoSegment) {
      this.todoSegments.push(segment);
    },
    clearTodoSegments() {
      this.todoSegments = [];
    },
    allocateTodos(todos: Todo[], appDateTimestamp: number) {
      this.clearTodoSegments();
      todos.forEach((todo) => {
        const assignedSegments = reallocateAllTodos(
          appDateTimestamp,
          [todo],
          this.pomodoroSegments
        );
        this.todoSegments.push(...assignedSegments);
      });
    },
  },
});
