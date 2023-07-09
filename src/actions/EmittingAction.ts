import type { Action, AsyncAction, AsyncEmitter, Message } from './Action'

/**
 * This is an action that can both receive messages and produce messages. Note that even though onMessage is
 * synchronous, the emit function is async so if you should not call emit from inside onMessage. If you need to do
 * that, use the AsyncEmitterAction. The emit function has to be async because it will pass the emitted message to
 * child nodes which may be asynchronous themselves.
 */
export abstract class EmittingAction<BI, BO> implements Action<BI, BO> {
    emit?: AsyncEmitter<BO>

    async start(emit: AsyncEmitter<BO>): Promise<void> {
        this.emit = emit
    }

    abstract onMessage(message: Message<BI>): Message<BO> | undefined
}

export abstract class AsyncEmittingAction<BI, BO> implements AsyncAction<BI, BO> {
    emit?: AsyncEmitter<BO>

    async start(emit: AsyncEmitter<BO>): Promise<void> {
        this.emit = emit
    }

    async flush(): Promise<boolean> {
        return false
    }

    abstract onMessage(message: Message<BI>): Promise<Message<BO> | undefined>
}
