import type { AsyncEmitter, Producer } from './Producer'

/**
 * Injects messages into a producer after it has been created by calling the produce method.
 */
export class DirectProducer<O> implements Producer<O, Record<string, never>> {
    private emit?: AsyncEmitter<O, Record<string, never>>

    async start(emit: AsyncEmitter<O, Record<string, never>>): Promise<void> {
        this.emit = emit
    }

    /**
     * Returns a promise that resolves when all sync actions have completed and the message has been queue to the async actions
     */
    async produce(message: O): Promise<void> {
        if (!this.emit) {
            throw new Error('DirectProducer: start has not been called on the route or the route is stopped')
        }
        return this.emit({ body: message, metadata: {} })
    }

    stop(): void {
        delete this.emit
    }
}
