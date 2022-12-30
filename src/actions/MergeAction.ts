import Denque from 'denque'
import type { Action, Message } from './Action.js'
import { AsyncEmittingAction } from './EmittingAction'

/**
 * This is the opposite of the SplittingAction. It receives messages and transforms them into an array. It buffers the
 * messages until the predicate returns true and, then it returns all the messages gathered so far.
 */
export class MergeAction<I> implements Action<I, I[]> {
    private readonly buffer = new Denque<Message<I>>()

    /**
     * @param predicate Function to determine whether to return the messages buffered so far
     */
    constructor(private readonly predicate: (buffer: Denque<Message<I>>) => boolean) {}

    onMessage = (message: Message<I>): Message<I[]> | undefined => {
        this.buffer.push(message)
        if (this.predicate(this.buffer)) {
            const result = mergeMessages(this.buffer)
            this.buffer.clear()
            return result
        } else {
            return undefined
        }
    }
}

export class MergeActionWithTimeout<BI> extends AsyncEmittingAction<BI, BI[]> {
    private readonly buffer = new Denque<Message<BI>>()
    private timer: NodeJS.Timeout | undefined

    /**
     * @param predicate Function to determine whether to return the messages buffered so far
     * @param timeout Optional timeout. If no messages are received within the timeout then the buffered messages are
     *     returned
     */
    constructor(private readonly predicate: (buffer: Denque<Message<BI>>) => boolean, private readonly timeout: number) {
        super()
    }

    async flush(): Promise<void> {}

    onMessage = async (message: Message<BI>): Promise<undefined> => {
        if (!this.emit) {
            throw new Error('Has start been called on the route?')
        }

        // If the timer is running, reset it as we've got a new message
        if (this.timer) {
            this.timer.refresh()
        } else {
            this.timer = setTimeout(this.onTimeout, this.timeout)
        }

        this.buffer.push(message)
        if (this.predicate(this.buffer)) {
            const result = mergeMessages(this.buffer)
            this.buffer.clear()

            await this.emit(result)
        }
        return undefined
    }

    private readonly onTimeout = (): void => {
        if (!this.emit) {
            throw new Error('Has start been called on the route?')
        }

        if (this.buffer.length > 0) {
            const result = mergeMessages(this.buffer)
            this.buffer.clear()
            this.emit(result)
                .then(() => {})
                // TODO how to handle errors?
                .catch(err => console.log(err))
        }

        // The timeout will restart next time we get a message so no need to do anything with it at this point
    }
}

function mergeMessages<I>(buffer: Denque<Message<I>>): Message<I[]> {
    const bodyArray = buffer.toArray().map(msg => {
        return msg.body
    })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const metadataArray = buffer.toArray().map(msg => msg.metadata)

    return { body: bodyArray, metadata: metadataArray }
}
