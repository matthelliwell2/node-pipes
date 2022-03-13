import type { Action, AsyncAction, AsyncEmitter, Message } from './Action'

/**
 * This is an action that can both receive messages and produce messages. Note that even though onMessage is synchronous, the emit function is async so if you should not call
 * emit from inside onMessage. If you need to do that, use the AsyncEmitterAction. The emit function has to be async because it will pass the emitted message to child nodes
 * which may be asynchronous themselves.
 */
export abstract class EmittingAction<BI, MI, BO, MO = MI> implements Action<BI, MI, BO, MO> {
    emit?: AsyncEmitter<BO, MO>

    async start(emit: AsyncEmitter<BO, MO>): Promise<void> {
        this.emit = emit
    }

    abstract onMessage(message: Message<BI, MI>): Message<BO, MO> | undefined
}

export abstract class AsyncEmittingAction<BI, MI, BO, MO = MI> implements AsyncAction<BI, MI, BO, MO> {
    emit?: AsyncEmitter<BO, MO>

    async start(emit: AsyncEmitter<BO, MO>): Promise<void> {
        this.emit = emit
    }

    abstract onMessage(message: Message<BI, MI>): Promise<Message<BO, MO> | undefined>
}
/**
 * Split an array into its individual elements. It extends AsyncEmittingAction because it needs to call the async emit
 * function as part of onMessage
 */
export class ArraySplittingAction<E, MI> extends AsyncEmittingAction<E[], MI, E, MI> {
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
