import Ember from 'ember';
import { computed } from '@ember/object';
import { registerWaiter } from '@ember/test';

let registered = false;
let taskRunCounter = 0;

// A function that, given a task property, will register it with the test
// waiter so async test helpers will block anytime a task instance spawned
// from that property is running.
export default function withTestWaiter(taskProperty) {
  let tp = function(...args) {
    // We want to get the `taskProperty`'s descriptor so that when our getter
    // is called, we can call its getter to get the task property, and replace
    // its task function before returning it.
    // Our first argument is modified in place, so we need to pass a copy of it
    // to `taskProperty` so its still pristine when we apply the arguments to
    // our computed property.
    let argsCopy = [
      Object.assign({}, args[0]),
      ...args.slice(1)
    ];
    let { descriptor } = taskProperty(...argsCopy);

    let cp = computed(function () {
      let task = descriptor.get.apply(this, arguments);

      let originalTaskFn = task.fn;
      task.fn = function *(...args) {
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
      task.fn.displayName = originalTaskFn.displayName;

      return task;
    });

    return Object.apply.call(cp, cp, args);
  };

  Ember._setComputedDecorator(tp);
  return tp;
}
