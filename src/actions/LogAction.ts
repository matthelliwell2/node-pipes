import type { Action, Message, OnMessage } from './Action'

export class LogAction<I, MI extends object> implements Action<I, I, MI> {
    constructor(private readonly prefix?: string) {}

    onMessage: OnMessage<I, I, MI> = (message: Message<I, MI>): Message<I, MI> => {
        if (this.prefix !== undefined) {
            console.log(this.prefix, message)
        } else {
            console.log(message)
        }
        return message
    }
}
