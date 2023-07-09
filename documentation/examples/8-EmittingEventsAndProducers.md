# Producers
Usually an action outputs mesages in response to an input message. However, you can also output messages based on different triggers such as file changing or a timeout.

A [Producer](../../src/producers) is the most common case of this. These don't take any input fron the framework but produce events from external triggers. eg the [DirectProducer](../../src/producers/DirectProducer.ts) we've used in the example producers an event in response to a function call. It is very useful for testing or quickly integrating external events.

To implement your own producer, implement the [Emitter](../../src/actions/Action.ts) interface and add it to the start of a route. When the route is started, the start method will be passed a function. Call this function whenver you want to emit an event.

# Other Emitters
You don't have to limit yourself to only using the Emit interface in producers. You can create actions that use the Emit interface. The [MergeAction](../../src/actions/MergeAction.ts) is a good example of this. It works the same way as a Producer: you are passed a function when start is called and you call this function wheneer you want to emit an event.

To save some boiler plate, extend the AsyncEmittingAction abstract class (or the EmittingAction class if you are implementing a synchronous action). This implements the start method for you.