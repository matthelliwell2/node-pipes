# Synchronous Route Example

This example shows a simple route where all the action are synchronous so the route will only process one message at a time. 

All routes start with a new route object

```typescript
import { Route } from '../../src/route/Route'
const route = new Route()
```

You need something at the start of the route that will generate messages. The library includes some examples, or you can write your own. In the case we'll use the DirectProducer class. This has a produce method on it that you can call at anytime to send a message.

```typescript
const testProducer = new DirectProducer<number>()
```

Note that the producer is strongly typed, so you know that it will always produce a message with the specified type of body, in this case, a number.

We want to do something with the numbers. As this is an example, we will double each number so let's define a function that takes a number and doubles it

```typescript
function double(num:number):number {
    return num * 2
}
```

For this example we want to be able to see what's happened. We'll define an array get use the prefined Collect action to store all the messages it receives in an array, which we can then examine.

```typescript
const results: Message<number>[] = []
```

We can then put these together to form the route.

See [example 1](1-SimpleSynchronousRoute.spec.ts) for a demonstration