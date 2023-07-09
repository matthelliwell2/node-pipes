# Merging and Splitting

Sometimes you want to output multiple events for a single input event. eg a file read might take an input event containing a file name and output one event for each line of the file. You can also do the opposite - receive multiple events and merge them into a single event.

# Splitting

The framework provides a couple of ways of creating multiple events from a single input. One is to use the [EventEmitter](8-EmittingEventsAndProducers.md) which is covered in example 8. The other is to return an array of messages. The framework will then pass each individual message to the downstream actions. This way is simpler but does mean that you need to do all the processing before any messages are passed to other actions.

As a basic example, lets write a route that takes a file name, reads all the lines in the the and then logs the length of each line. First we need a function to read all the lines from a file and another to calculate the length of a string:

```typescript
function readFile(filename: string): string[] {
    return fs
        .readFileSync(filename)
        .toString()
        .split(/\n\r|\n/)
}

function toLength(value: string): number {
    return value.length
}
```
A first attempt to put these into a route might be:
```typescript
const route = new Route()
const filenameProducer = new DirectProducer<string>()

route.from(filenameProducer).to(readFile, { handleMetadata: false }).to(toLength, { handleMetadata: false }).log()
```
But this won't work and will give you a compilation error. This is because you are just handling the body of the message. The framework won't try and split the array into individual messages as it doesn't know if that's what you want to do. So the output of readFile is a single message of a string array which can't be passed into the toLength function.

Instead you have to deal with Messsage objects. The framework can then distinguish between and message containing an array of string and an array of messages containing strings. Re-writing the functions gives us

```typescript
function readFile(filename: Message<string>): Message<string>[] {
    return fs
        .readFileSync(filename.body)
        .toString()
        .split(/\n\r|\n/)
        .map(line => {
            return { body: line, metadata: filename.metadata } // Just return the same metadata as was passed in
        })
}

route.from(filenameProducer)
    .to(readFile, { handleMetadata: true })
    .to(toLength, { handleMetadata: false })
    .log()
```

Running the [example](7-MergingAndSplitting.spec.ts) will show you the length of each line being logged.

# Merging

Doing the opposite of this is also common. For example when writing to a database, we might want to collect several messages together and write them as a single batch. The framework has a [MergeAction](../../src/actions/MergeAction.ts) class to do this for you. It lets you merge messages based on a predicate and a timeout so you don't wait indefinitely for the predicate to complete. For example suppose I am writing to AWS Dynamodb and want to write up to 25 messages at a time as that is the maximum batch size. However, if I haven't received 25 messages with 5 seconds, I'll write whatever I have.

I can add a new MergeAction o the route:
```typescript
.toAsync(
    new MergeAction(q => {
        return q.length >= 25
    }, 5000)
)
```
The next step in the route will then receive an array of objects, with a maximum size of 25.

