import type { Action, AsyncAction, AsyncEmitter, Message } from './Action'

/**
 * This is an action that can both receive messages and produce messages. Note that even though onMessage is synchronous, the emit function is async so if you should not call
 * emit from inside onMessage. If you need to do that, use the AsyncEmitterAction. The emit function has to be async because it will pass the emitted message to child nodes
 * which may be asynchronous themselves.
 */
export abstract class EmittingAction<I, O, MI extends object, MO extends object> implements Action<I, O, MI, MO> {
    emit?: AsyncEmitter<O, MO>

    async start(emit: AsyncEmitter<O, MO>): Promise<void> {
        this.emit = emit
    }

    abstract onMessage(message: Message<I, MI>): Message<O, MO> | undefined
}

export abstract class AsyncEmittingAction<I, O, MI extends object, MO extends object> implements AsyncAction<I, O, MI, MO> {
    emit?: AsyncEmitter<O, MO>

    async start(emit: AsyncEmitter<O, MO>): Promise<void> {
        this.emit = emit
    }

    abstract onMessage(message: Message<I, MI>): Promise<Message<O, MO> | undefined>
}
/**
 * Split an array into its individual elements.
 */
export class ArraySplittingAction<E, MI extends object> extends AsyncEmittingAction<E[], E, MI, MI> {
    onMessage = async (message: Message<E[], MI>): Promise<Message<E, MI> | undefined> => {
        if (!this.emit) {
            throw new Error('Start has not been called on the route')
        }

        for (const element of message.body) {
            await this.emit({ body: element, metadata: message.metadata })
        }

        return undefined
    }
}
