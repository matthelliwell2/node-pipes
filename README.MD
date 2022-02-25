# A Node library to simplify writing multithreaded and asynchronous code.

Using worker threads in Node can be a pain, all the synchronisation code can get mixed up with your business logic.

This library makes it easy to write multithreaded applications. Incidently all the logic that works across threads also works with asychronous code so now you don't need
two different styles of coding.

## Concepts

The library works on the basic of **messages**, **routes**, **producers** and **actions**.

A route is a graph of actions. A producer creates a message from some external source, such as a file. This is passed to the route. The route then passes the message to each 
action in
the route. When an action receives a message it can:

1. Transform the message. The transformed message will be passed onto subsequent actions.
2. Throw the message away. Nothing else will be done with the message
3. Perform some side effect, such as writing a message to the console. 

For example you might have a file of ISBN numbers for books. A FileProducer will produce a message for each line in the file. This is passed to an action that looks up the 
author and title of the book in a database. The author and title are passed to a second action that writes them to another file.

### Back pressure

In this example, reading from the database would be asynchronous, but still in the same thread. Generally you can read from a file a lot faster than you can read from a database
so if we didn't do anything we either overload the database with simultanous connection or we'd just run one query at a time, which would be unnecessarily slow. To get around
this, when you have an asynchronous action, you can define how many instances of the action can run at once. Once the limit is reached, subsequent messages will be queued and 
processed when possible. You can define a limit to how many messages can be queued. Once this limit is reach, the system will apply back pressure so the up stream actions and 
producers can pause until capacity is available.

### State

Actions can be stateful or stateless. For example if you have an action that filters out every other line of a file, that would only need to know about the current line so it
wouldn't need to maintain any state. Instead of you want to group together every 5 messages into an array, the action would have to remember each message so it can group them
together.
