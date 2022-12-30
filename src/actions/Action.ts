/**
 * The messages passed between actions.
 *
 * The message body and the metadata are both treated in a similar way when processing but are intended to be used
 * differently. The body is strongly typed and is used to pass data between child and parent actions. An action can do
 * whatever it wants with the body and return whatever it whats
 *
 * The metadata should never be deleted, only added to. So if an action receives metadata but isn't interested in it,
 * it should just return that same metadata.
 *
 * The framework automatically added some specific metadata, such as a message id and, but beyond that you are free to
 * use them how you want add any fields that you want.
 *
 * To make life easier, there are helper functions that allow you define actions without worrying about the metadata.
 * The framework will ensure that it is passed around unchanged.
 *
 * @template B The type of the message body
 */
export interface Message<B> {
    /**
     * The body of the message
     */
    body: B

    /**
     * The metadata.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any
}

export type AsyncProcessMessage<BI, BO> = (message: Message<BI>) => Promise<Message<BO> | Message<BO>[] | undefined>
export type ProcessMessage<BI, BO> = (message: Message<BI>) => Message<BO> | Message<BO>[] | undefined

export type AsyncProcessBody<BI, BO> = (body: BI) => Promise<BO | undefined>
export type ProcessBody<BI, BO> = (body: BI) => BO | undefined

/**
 * An AsyncEmitter is a function that is used to generate messages that are processed by an async function
 */
export type AsyncEmitter<BO> = (message: Message<BO>) => Promise<void>

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
 * the onMessage method. However if the action need to produce multiple messages, or produce a message independently of
 * when onMessage is called, you can call emit multiple times.
 *
 * If you implement the start function and need to free up resources when the route is stopped, make sure you implement
 * the stop method.
 *
 * If you call emit and return a value from onMessage, both messages will be processed.
 *
 * @template I the type of the body in the message passed into the onMessage call
 * @template O the type of the body in the message returned from the onMessage call or from the emit call
 */
export interface Action<BI, BO> extends Partial<Emitter<BO>> {
    /**
     * The handler for a message. Once the action has done any processing on this it can return
     *  - undefined if no further processing is to be done on the message
     *  - a message to be passed to downstream actions
     */
    onMessage: ProcessMessage<BI, BO>
}

/**
 * Wraps a function for processing a message in an Action objecy
 */
export function actionFromProcessMessage<BI, BO>(processMessage: ProcessMessage<BI, BO>): Action<BI, BO> {
    return { onMessage: processMessage }
}

export function asyncActionFromProcessMessage<BI, BO>(processMessage: AsyncProcessMessage<BI, BO>): AsyncAction<BI, BO> {
    return { onMessage: processMessage }
}

/**
 * Wrap a function for processing a message body in an action such that the metadata is unchanged. Note that if the
 * function returns an array, there is no way from telling if this is because the array should be treated as the body
 * of the message or if each array element should be treated as a separate message. By default, an array will just be
 * treated as the body of the returned message. If you want to split the results into separate messages you can either
 * 1. handle the processMessage or Action objects directly
 * 2. Pass the results into an array splitter as the next action
 */
export function actionFromProcessBody<BI, BO>(processBody: ProcessBody<BI, BO>): Action<BI, BO> {
    return {
        onMessage: (message: Message<BI>): Message<BO> | undefined => {
            const result = processBody(message.body)
            if (result === undefined || result === null) {
                return undefined
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { body: result, metadata: message.metadata }
            }
        }
    }
}

export function asyncActionFromProcessBody<BI, BO>(processBody: AsyncProcessBody<BI, BO>): AsyncAction<BI, BO> {
    return {
        onMessage: async (message: Message<BI>): Promise<Message<BO> | undefined> => {
            const result = await processBody(message.body)
            if (result === undefined || result === null) {
                return undefined
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                return { body: result, metadata: message.metadata }
            }
        }
    }
}

/**
 * An interface to emitting messages out of sync from when messages are received. Note that if you are implementing
 * this as part of an action, it is possible for you to start emitting messages before all the route has initialised.
 */
export interface Emitter<BO> {
    /**
     * The framework will call this method when the route is started. It will pass in a function that can be called
     * when the action wants to send a message to the route.
     */
    start(emit: AsyncEmitter<BO>): Promise<unknown>

    /**
     * The framework will call this method when waitForWorkersToFinish. It should emit or discard any buffered messages
     * to ensure all requires messages are processed.
     */
    flush(): Promise<void>

    /**
     * Called when the route is being stopped. It should free any resource and stop producing any more messages. The
     * framework will wait on the returned promise.
     */
    stop(): Promise<void>
}

/**
 * This is identical to the Action interface but the onMessage methods returns a promise so you can do asynchronous
 * processing.
 * @see Action
 */
export interface AsyncAction<BI, BO> extends Partial<Emitter<BO>> {
    onMessage: AsyncProcessMessage<BI, BO>
}
