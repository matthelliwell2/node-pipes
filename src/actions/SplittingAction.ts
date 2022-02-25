import type { Action, Message } from './Action'

export type Emitter<O, MO extends object> = (message: Message<O, MO>) => void

/**
 * Actions which extend splitter action are treated differently to other actions. The return value is ignored. Instead the emit function should be called for each message that
 * you want to emit. The messages will be buffered and only sent once the onMessage method returns.
 */
export abstract class SplittingAction<I, O, MI extends object, MO extends object> implements Action<I, O, MI, MO> {
    /**
     * Set when route.start() is called. Call this for each message produced.
     */
    emit?: Emitter<O, MO>

    abstract onMessage(message: Message<I, MI>): Message<O, MO> | undefined
}

/**
 * Split an array into its individual elements
 */
export class ArraySplittingAction<E, MI extends object> extends SplittingAction<E[], E, MI, MI> {
    onMessage = (message: Message<E[], MI>): Message<E, MI> | undefined => {
        if (!this.emit) {
            throw new Error('Start has not been called on the route')
        }
        for (const element of message.body) {
            this.emit({ body: element, metadata: message.metadata })
        }

        return undefined
    }
}
