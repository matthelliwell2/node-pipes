import type { Action, Message, OnMessage } from './Action'

export class LogAction<BI, MI> implements Action<BI, MI, BI, MI> {
    constructor(private readonly prefix?: string) {}

    onMessage: OnMessage<BI, MI, BI, MI> = (message: Message<BI, MI>): Message<BI, MI> => {
        if (this.prefix !== undefined) {
            console.log(this.prefix, message)
        } else {
            console.log(message)
        }
        return message
    }
}
