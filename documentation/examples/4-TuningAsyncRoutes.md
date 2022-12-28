# Tuning Async Routes

The previous example is fine for very simple cases but once you start using async functions, you need to control how many can be running at the same time. The framework provides two parameters to control async functions:

## Queue Size
Behind the scenes, the framework maintains a queue of messages in front of each async action. This lets you queue up messages for an action, waiting to be processed. This stops slow actions immediately blocking faster actions. Once the queue is full, actions will start to block as the framework applies back pressure. You can configure the size of these queues to whatever is appropriate for your route.

The queue size defaults to 2.

## Parallel Executions
As well as the queue size, you can also control how many async actions are run in parallel. For example, you might be happy with 50 calls to getBookInfo running in parallel but only want a couple of calls to updateBookInfo to being running at the same time.

The number of parallel functions defaults to 2.

Tuning the queue sizes and number of parallel actions lets you optimise the flow through your route. 

If we take example 3 but now we want to allow 10 database calls at a time and we'll buffer upto 15 messages then we'd write:

```typescript
route
    .from(isbnProducer)
    .toAsync(getBookInfo, { handleMetadata: false })
    .toAsync(updateBookInfo, { handleMetadata: false, bufferSize: 15, concurrency: 10 })

```

If you now run [the example](4-TuningAsyncRoutes.spec.ts) you can see the logs reporting that the buffer size starts to increase once maximum number of updateBookInfo functions are running.