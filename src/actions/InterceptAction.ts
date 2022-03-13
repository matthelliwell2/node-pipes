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
export class InterceptAction<BI, MI> implements Action<BI, MI, BI, MI & InterceptActionMetadata> {
    constructor(private readonly messages: Pushable<Message<BI, MI>>) {}

    onMessage = (message: Message<BI, MI>): Message<BI, MI & InterceptActionMetadata> => {
        this.messages.push(message)
        return { body: message.body, metadata: { ...message.metadata, collectionDateTime: new Date().toISOString() } }
    }
}
