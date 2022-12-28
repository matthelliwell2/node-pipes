# Handling Metadata

So far, all the example routes have just dealt with whatever type of objects it is that your actions need. The type of messages passed between action are actually typed as

```typescript
interface Message<B> {
    body: B
    metadata: any
}
```
where the body field is the number/string/object etc that you've been dealing with so far. The metadata is just another field in the message that you are free to manipulate as you see fit. It differs from the body:
1. It is untyped so you can put whatever you like in it and you won't get compilation errors. Equally, it's up to you to make sure you only try and read valid values.
2. The framework can add fields to the metadata, eg a producer adds a timestamp of when the message was produced.
3. You should not delete any fields from the metadata, just add or amend fields. This makes it easier for different actions to be able to use the metadata.

For example, we know that a producer adds a timestamp to the metadata for each message. We can use this to record how long each message took to process. We'll up the previous exampe to do this:
```typescript
.to(message => {
    const producedAt = new Date(message.metadata.producedDateTime).getTime()
    console.log('Elapsed time:', new Date().getTime() - producedAt, 'ms')
    return message
}, true)
```

If you run the [full example](5-HandlingMetadata.spec.ts) you will see it logging the elapsed time.
