# Customising Actions

If the previous example don't give you enough flexability to implement the functiomality, you have the option of writing actions to do whatever you need and passing these into your route.

The various methods you've seen so far (to. toAsync etc) are just helper methods. In each one, the framework is creating an Action object for you. The action object is a container for your function. If you create the action object yourself, you can add other information to do. For example, you might want to store database connection details in the action so you don't have to keep reconnecting to the database.

In this example, we are just going to throw away every other message. We can't use the filter helper function for this as this only knows about the current message. Instead, we'll store the count of messages in the Action object. We can then write a function that checks the message count. The function can then return undefined (to discard the message) if the count is even.

The action object is defined as implementing this interface:
```typescript
export interface Action<BI, BO> extends Partial<Emitter<BO>> {
    onMessage: ProcessMessage<BI, BO>
}
```
Ignore the Emitter part for now, we'll talk about that later. You just need to implement the onMessage method.