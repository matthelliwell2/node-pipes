import type { Message } from '../actions/Action'

export type AsyncEmitter<O, M extends object = object> = (message: Message<O, M>) => Promise<void>
export interface Producer<O, M extends object = object, R = void> {
    /**
     * Called by the framework when route is started so the producer can start producing messages. It should call the emit function for each message it wants to be processed
     * by the route. This method should return without blocking so that other processing can happen.
     *
     * @return The return value is ignored by the route.
     */
    start: (emit: AsyncEmitter<O, M>) => Promise<R>

    /**
     * Called when the route is being stopped. The producer should free any resource and stop producing any more messages.
     */
    stop(): void
}
