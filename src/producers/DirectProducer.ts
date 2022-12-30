import type { AsyncEmitter, Emitter } from '../actions/Action'

/**
 * Injects messages into a route after it has been created by calling the produce method.
 */
export class DirectProducer<O> implements Emitter<O> {
    private emit?: AsyncEmitter<O>

    async start(emit: AsyncEmitter<O>): Promise<void> {
        this.emit = emit
    }

    /**
     * Returns a promise that resolves when all sync actions have completed and the message has been queue to the async actions.
     * You should await on this promise to handle back pressure from the framework.
     */
    // TODO async produce(message:Message<BO>)
    async produce(body: O): Promise<void> {
        if (!this.emit) {
            throw new Error('DirectProducer: start has not been called on the route or the route is stopped')
        }
        return this.emit({ body: body, metadata: {} })
    }

    async stop(): Promise<void> {
        // We don't need to clean anything up but delete the emitter to catch any problems with produce being called again.
        delete this.emit
    }

    /**
     * No messages are buffered so no need to do anything
     */
    async flush(): Promise<void> {}
}
