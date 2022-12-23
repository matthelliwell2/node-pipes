import type { Action, Message } from './Action'

export interface InterceptActionMetadata {
    collectionDateTime: string
}

export interface Pushable<E> {
    push(element: E): unknown
}

/**
 * Adds each message to the specified queue or array and then passes the message on for processing. If this is running
 * in a worker thread then you can't see the collected values in the main thread. It will collect the messages into any
 * object that implements a push method such as array or Denqu.
 *
 * The action adds a timestamp to the metadata
 */
export class InterceptAction<BI> implements Action<BI, BI> {
    /**
     * @param interceptedMessages The array or queue into which intercepted messages are pushed
     */
    constructor(private readonly interceptedMessages: Pushable<Message<BI>>) {}

    onMessage = (message: Message<BI>): Message<BI> => {
        this.interceptedMessages.push(message)
        // TODO what is the collectionDateTime meant to be doing?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { body: message.body, metadata: { ...message.metadata, collectionDateTime: new Date().toISOString() } }
    }
}
