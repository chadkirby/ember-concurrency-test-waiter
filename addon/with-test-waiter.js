import { assert } from '@ember/debug';
import Ember from 'ember';
import { registerWaiter } from '@ember/test';

let registered = false;
let taskRunCounter = 0;

function legacyWithTestWaiter(taskProperty) {
  assert("withTestWaiter() will only work with ember-concurrency >=0.7.19 -- please upgrade", taskProperty.taskFn);

  let originalTaskFn = taskProperty.taskFn;

  taskProperty.taskFn = function *(...args) {
    if (Ember.testing && !registered) {
      registerWaiter(() => taskRunCounter === 0);
      registered = true;
    }

    taskRunCounter += 1;
    try {
      return yield * originalTaskFn.apply(this, args);
    } finally {
      taskRunCounter -= 1;
    }
  };

  return taskProperty;
}

// A function that, given a task property, will register it with the test
// waiter so async test helpers will block anytime a task instance spawned
// from that property is running.
export default function withTestWaiter(taskProperty) {
  if (!taskProperty.registerWrapper) {
    return legacyWithTestWaiter(taskProperty);
  }

  taskProperty.registerWrapper(function *(fn) {
    if (Ember.testing && !registered) {
      registerWaiter(() => taskRunCounter === 0);
      registered = true;
    }

    taskRunCounter += 1;
    try {
      return yield * fn();
    } finally {
      taskRunCounter -= 1;
    }
  });

  return taskProperty;
}
