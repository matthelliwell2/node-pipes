/**
 * The messages passed between actions.
 *
 * The message body and the metadata are both treated in a similar way when processing but are semantically different.
 * The body is the actual object you perform actions on and the metadata is information about the body. The framework
 * automatically added some specific metadata, such as a message id and  but beyond that you are free to use them how
 * you want. It is recommended that you always added to the metadata and return an updated object. That was the metadata
 * can be used to pass information between cooperating actions.
 *
 * @template B The type of the message body
 * @template M The type of the metadata for the message
 */
export interface Message<B, M> {
    body: B
    metadata: M
}

export type AsyncOnMessage<BI, MI, BO, MO = MI> = (message: Message<BI, MI>) => Promise<Message<BO, MO> | Message<BO, MO>[] | undefined>
export type OnMessage<BI, MI, BO, MO = MI> = (message: Message<BI, MI>) => Message<BO, MO> | Message<BO, MO>[] | undefined
export type AsyncEmitter<BO, MO> = (message: Message<BO, MO>) => Promise<void>

/**
 * An action is an object that processes messages. It lives as part of a route so can receive messages from upstream
 * actions and pass messages to downstream actions. It can do several things depending on how it is defined:
 * 1. Receive a message through onMessage being called. It can do whatever processing is necessary on the message
 * 2. Take the received message, transform it if necessary and send it to downstream actions
 * 3. Generate one or messages from an external source, eg lines from a file
 * 4. Generate more than one message in response to a received message, eg split an array into individual messages.
 *
 * The last two operations require the start function to be defined. If it is defined then the framework will
 * automatically call it when the route is started. The action should save the emit parameter passed to it and call
 * it whenever it needs to produce a message.
 *
 * If the action only needs to produce a single message, calling emit is exactly the same as returning a message from
 * the onMessage method. However if the action need to produce multiple messages, or produce a message indepentently of
 * when onMessage is called, you can call emit multiple times.
 *
 * If you implement the start function and need to free up resources when the route is stopped, make sure you implement
 * the stop method.
 *
 * If you call emit and return a value from onMessage, both messages will be processed.
 *
 * @template I the type of the body in the message passed into the onMessage call
 * @template MI the type of the metadata in the message passed into the onMessage call
 * @template O the type of the body in the message returned from the onMessage call or from the emit call
 * @template MO the type of the metadata in the message returned from the onMessage call or from the emit call
 */
export interface Action<BI, MI, BO, MO = MI> extends Partial<Emitter<BO, MO>> {
    /**
     * The handler for a message. Once the action has done any processing on this it can return
     *  - undefined if no further processing is to be done on the message
     *  - a message to be passed to downstream actions
     */
    onMessage: OnMessage<BI, MI, BO, MO>
}

/**
 * An interface to emitting messages out of sync from when messages are received. Note that if you are implementing
 * this as part of an action, it is possible for you to start emitting messages before all the route has initialised.
 */
export interface Emitter<BO, MO> {
    /**
     * The framework will call this method when the route is started. It will pass in a function that can be called
     * when the action wants to send a message to the route.
     */
    start: (emit: AsyncEmitter<BO, MO>) => Promise<unknown>

    /**
     * Called when the route is being stopped. It should free any resource and stop producing any more messages. The
     * framework will wait on the returned promise.
     */
    stop(): Promise<void>
}

/**
 * This is identical to the Action interface but the onMessage methods returns a promise so you can do asynchronous
 * processing. The route will wait on the returned promise.
 * @see Action
 */
export interface AsyncAction<BI, MI, BO, MO = MI> extends Partial<Emitter<BO, MO>> {
    onMessage: AsyncOnMessage<BI, MI, BO, MO>
}
