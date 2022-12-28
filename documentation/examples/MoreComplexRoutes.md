# More Complex Routes

So far, all our routes have been linear, one action executes after another. The framework allows you to define more complex routes, for example sending a message to two different actions in parallel. From the previous example, suppose that as well as writing the book info to a database, we also want to send it to a queue for processing by an external service.

We'll define another function to write to the queue:

```typescript

```