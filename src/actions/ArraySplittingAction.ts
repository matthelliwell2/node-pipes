import type { Action, Message } from './Action'

/**
 * Split an array into its individual elements.
 */
export class ArraySplittingAction<E, MI> implements Action<E[], MI, E, MI> {
    onMessage = (message: Message<E[], MI>): Message<E, MI>[] => {
        return message.body.map(elem => {
            return { body: elem, metadata: message.metadata }
        })
    }
}
