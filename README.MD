# A Node library help separate your business logic from the internal flow of your application

Vaguely inspired by Apache Camel, this library lets you define your application as a number of steps. At each an asynchronous or a synchronous function is run. It can be run in the main thread or a worker thread.

This can help in two ways:
1. Separation of concerns. How data flows through you application is separate from how that data is generated and processed.
2. Multithreading. Using worker threads in nodejs is a pain. This library makes it easier.

## Concepts

The key concepts are **messages**, **routes**, **producers** and **actions**.

### Actions

Actions are where you write your application logic, whether it's calculating an APR or saving addresses to a database. When an action receives a message it can:

1. Transform the message. The transformed message will be passed onto subsequent actions.
2. Throw the message away. Nothing else will be done with the message
3. Perform some side effect, such as writing a message to the console.

### Messages

Messages are the input and output from actions. Each action receives a single message as input and can produce single, multiple or no messages as its output.

A message consists of a strongly-typed body and metadata. Most of the time you can ignore the metadata and just worry about passing your objects between the actions in the route.

### Routes

A route is a graph of actions. It defines how actions are linked together. For example, the file reader action above might pass its messages to a database to persist each line as a separate row. Actions don't know about each other, all they see are messages coming and messages going on. They don't know who send them the message or where the output messages are sent. This is all controlled by the route. This makes it easier to compose new routes using existing actions.

### Producers

A producer is a think that feeds messages into a route. For example if you put the file reader action from above, it would just sit there until it got a message. A producer sends a message to the first action in a route so the route will actually do something useful. The library comes with some standard producers but it's easy to add your own so you can integrate external systems into the route.

For example, you might have a file of ISBN for books. A producer will produce a message for each line in the file. This is passed to an action that looks up the author and title of the book in a database. The author and title are passed to a second action that writes them a database.

### Back pressure

Different action might run at different speeds. If all your code is synchronous, this isn't a problem. But if you define a route to be multithreaded or use async functions, there needs to be a way to stop parts of the route getting overwhelmed. In the example above, if you read ISBNs from the file a lot quick than you can look up the author and title, then all the messages containing ISBNs would be queued up waiting to be processed, potentially causing the application to fail if it runs out of memory.

To get around this you an define how many asynchronous actions can be running at the same time. Once this limit is reached, messages will be queued and processed when an action has some capacity. You can also define a maximum size for the queue. Once the queue is full, the library will apply back pressure so upstream actions and producers will be paused until capacity is available.//s

### State

Actions can be stateful or stateless. For example if you have an action that filters out every other line of a file, that would only need to know about the current line so it
wouldn't need to maintain any state. Instead of you want to group together every 5 messages into an array, the action would have to remember each message so it can group them
together.
