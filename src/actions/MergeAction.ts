import Denque from 'denque'
import type { Action, Message } from './Action.js'
import { AsyncEmittingAction } from './EmittingAction'

/**
 * This is the opposite of the SplittingAction. It receives messages and transforms them into an array. It buffers the
 * messages until the predicate returns true and, then it returns all the messages gathered so far.
 */
export class MergeAction<I, MI> implements Action<I, MI, I[], MI[]> {
    private readonly buffer = new Denque<Message<I, MI>>()

    /**
     * @param predicate Function to determine whether to return the messages buffered so far
     */
    constructor(private readonly predicate: (buffer: Denque<Message<I, MI>>) => boolean) {}

    onMessage = (message: Message<I, MI>): Message<I[], MI[]> | undefined => {
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

export class MergeActionWithTimeout<BI, MI> extends AsyncEmittingAction<BI, MI, BI[], MI[]> {
    private readonly buffer = new Denque<Message<BI, MI>>()
    private timer: NodeJS.Timeout | undefined

    /**
     * @param predicate Function to determine whether to return the messages buffered so far
     * @param timeout Optional timeout. If no messages are received within the timeout then the buffered messages are
     *     returned
     */
    constructor(private readonly predicate: (buffer: Denque<Message<BI, MI>>) => boolean, private readonly timeout: number) {
        super()
    }

    onMessage = async (message: Message<BI, MI>): Promise<undefined> => {
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

function mergeMessages<I, MI>(buffer: Denque<Message<I, MI>>): Message<I[], MI[]> {
    const bodies = buffer.toArray().map(msg => {
        return msg.body
    })
    const metadata = buffer.toArray().map(msg => {
        return msg.metadata
    })

    return { body: bodies, metadata: metadata }
}
