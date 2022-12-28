import type { Action, Message } from './Action'

/**
 * Splits a message whose body is an array into messages where each element is a separate message
 */
export class ArraySplittingAction<E> implements Action<E[], E> {
    onMessage = (message: Message<E[]>): Message<E>[] => {
        return message.body.map(elem => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { body: elem, metadata: message.metadata }
        })
    }
}
