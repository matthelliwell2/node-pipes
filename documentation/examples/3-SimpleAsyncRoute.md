# Async Actions

The previous two examples both used synchronous methods. However, the framework becomes a lot more useful when you start using async methods and worker threads (which we'll cover later).

For example, suppose we have a message that is the ISBN for a book. We want to look up some information for the book from an external service and update a database with the results. Let's assume we've already got two functions that will call the external service and write to the database:

```typescript
interface BookInfo {
    author: string
    title: string
    datePublished: string
}

async function getBookInfo(isbn: string): Promise<BookInfo>
async function updateBookInfo(bookInfo: BookInfo): Promise<void>
```
If we just tried to string these together using the 'to' method we saw earlier, we'd run into problems as we don't have any way of waiting on promises. To solve this, the framework provides async versions of most methods. In this case, we can use the toAsync method that will wait on the promise and pass the awaited value to the next action.

So our route would now look like:

```typescript
const route = new Route()
// For the moment, ignore where we get the ISBN from and just pass them straight into the route.
const isbnProducer = new DirectProducer<string>()
const results: Message<number>[] = []

route
    .from(isbnProducer)
    .toAsync(getBookInfo, { handleMetadata: false })
    .toAsync(updateBookInfo, { handleMetadata: false })

await route.start()

await isbnProducer.produce('1-56619-909-3')
await route.waitForWorkersToFinish()
```

There are a few points to note about this:
1. The await on the produce method is important. This returns a promise that resolves either when the message is processed by the synchronous actions or when it is queued up ready to be processed by an async action. The await allows for processing to be paused when the queues are at full capacity.
2. The waitForWorkersToFinish method returns a promise that resolves when all actions have completed for all actions. If you don't call this then you might end up with some messages being only partly processed.
3. The second parameter to the toAsync method is necessary to help Typescript with the function overloading. You will see cases in later examples where handleMetadata needs to be set to true.

See [example 3](3-SimpleAsyncRoute.spec.ts) for a demonstration. You will be able to see from the logs that the updateBookInfo isn't executed until the promise from getBookInfo resolves.

You can freey mix synchronous and async methods in the route.