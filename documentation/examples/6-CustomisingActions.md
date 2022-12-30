# Customising Actions

If the previous example don't give you enough flexability to implement the functionality, you have the option of writing actions to do whatever you need and passing these into your route.

The various methods you've seen so far (to, toAsync etc) are just helper methods. In each one, the framework is creating an Action object for you. The action object is a container for your function. If you create the action object yourself, you can add other information to do. For example, you might want to store database connection details in the action so you don't have to keep reconnecting to the database.

In this example, we are just going to throw away every other message. We can't use the filter helper function for this as this only knows about the current message. Instead, we'll store the count of messages in the Action object. We can then write a function that checks the message count. The function can then return undefined (to discard the message) if the count is even.

The action object is defined as implementing this interface:
```typescript
export interface Action<BI, BO> extends Partial<Emitter<BO>> {
    onMessage: ProcessMessage<BI, BO>
}
```
Ignore the Emitter part for now, we'll talk about that later. You just need to implement the onMessage method.

```typescript
class FilterEveryOtherMessageAction<I> implements Action<I, I> {
    private count = 0
    
    onMessage(message: Message<I>): Message<I> | undefined {
        ++this.count
        if (this.count % 2 === 0) {
            return message
        } else {
            return undefined
        }
    }
}
```
The output type is the same as the input type so we can define the Action as Action<I, I>

To use this at any point in a route we just in an instance of the class. The method is synchronous so can use the to method:

```typescript
.to(new FilterEveryOtherMessageAction())
```

This works just as well with an async method. For example, we might want to connect to the database once in the updateBookInfo method. We could wrap this method in an action. 
```typescript
class UpdateBookInfoAction implements AsyncAction<BookInfo, BookInfo> {
    async onMessage(bookInfo: Message<BookInfo>): Promise<Message<BookInfo>> {
        // To simulate a database call, we'll just add a delay
        console.log(new Date(), 'ENTER: updateBookInfo', bookInfo)
        await sleep(2000)
        console.log(new Date(), 'EXIT: updateBookInfo')
        return bookInfo
    }

    async start(): Promise<void> {
        console.log('Connect to the database here and store connection in a field')
    }
}
```

We implement the connect in the start method. This is called when start is called on the route so makes an ideal place to do one-time initialisation. If you want to disconnect from the database when the route is finished, implement the stop method and make sure route.stop() is called.

See the [here](6-CustomisingActions.spec.ts) for an example.
