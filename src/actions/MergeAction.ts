import Denque from 'denque'
import type { Action, Message } from './Action.js'

/**
 * This is the opposite of the SplittingAction. It receives messages and transforms them into an array. It buffers the messages until the predicate returns true and then it
 * return all the messages gathered so far. There is an optional timeout. If a message is not received within the timeout then whatever messages are buffered so far as
 * returned.
 */
export class MergeAction<I, MI extends object> implements Action<I, I[], MI, MI[]> {
    private readonly buffer = new Denque<Message<I, MI>>()
    private timer: NodeJS.Timeout | undefined

    /**
     * @param predicate Function to determine whether to return the messages buffered so far
     * @param timeout Optional timeout. If no messages are received within the timeout then the buffered messages are returned
     */
    constructor(private readonly predicate: (buffer: Denque<Message<I, MI>>) => boolean, private readonly timeout = 0) {}

    onMessage = (message: Message<I, MI>): Message<I[], MI[]> | undefined => {
        // If the timer is running, reset it as we've got a new message
        if (this.timer) {
            this.timer.refresh()
        } else {
            this.timer = setTimeout(() => {}, this.timeout)
        }

        this.buffer.push(message)
        if (this.predicate(this.buffer)) {
            const bodies = this.buffer.toArray().map(msg => {
                return msg.body
            })
            const metadata = this.buffer.toArray().map(msg => {
                return msg.metadata
            })

            this.buffer.clear()
            return { body: bodies, metadata: metadata }
        } else {
            return undefined
        }
    }
}
