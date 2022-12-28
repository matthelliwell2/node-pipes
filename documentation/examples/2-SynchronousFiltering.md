# Filtering messages

The framework provides a number of ways to handle messages, over and above writing tour own actions. The first of these is a filter. This lets you write a function that controls whether the message is discarded or passed to subsequent action.

We'll start with the code from example 1 but this time we'll add a method to filter out negative number. To do this we use the filter method in the route:

```typescript
.filter(body => body >= 0)
```
If the function returns true, the message is passed to the next action, otherwise it is discarded. Note that in this simple case, we are just looking at the body of the message. Behind the scenes, the framework is creating an [Action](../../src/actions/Action.ts) for you (in this case, a [FilterAction](../../src/actions/FilterAction.ts)). If you need more control, you can deal with the actions directly but most of the time you can rely on the actions automatically created by the framework.

See [example 2](2-SynchronousFiltering.spec.ts) for a demonstration