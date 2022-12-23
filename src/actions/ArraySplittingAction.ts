import type { Action, Message } from './Action'

/**
 * Split an array into its individual elements.
 */
export class ArraySplittingAction<E> implements Action<E[], E> {
    onMessage = (message: Message<E[]>): Message<E>[] => {
        return message.body.map(elem => {
            return { body: elem, metadata: message.metadata }
        })
    }
}
