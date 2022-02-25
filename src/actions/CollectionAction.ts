import type { Action, Message } from './Action'

export interface CollectionActionMetadata {
    collectionDateTime: string
}

export interface Pushable<E> {
    push(element: E): unknown
}

/**
 * Adds each message to the specified queue or array and then passes the message on for processing. If this is running in a worker thread then you can't see the collected
 * values in the main thread. It will collect the messages into any object that implements a push method such as array or Denqu.
 *
 * The action adds a timestamp to the metadata
 */
export class CollectionAction<I, MI extends object> implements Action<I, I, MI & CollectionActionMetadata> {
    constructor(private readonly messages: Pushable<Message<I, MI>>) {}

    onMessage = (message: Message<I, MI>): Message<I, MI & CollectionActionMetadata> => {
        this.messages.push(message)
        return { body: message.body, metadata: { ...message.metadata, collectionDateTime: new Date().toISOString() } }
    }
}
