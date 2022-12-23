import type { Action, Message, ProcessMessage } from './Action'

export class LogAction<BI> implements Action<BI, BI> {
    constructor(private readonly prefix?: string) {}

    onMessage: ProcessMessage<BI, BI> = (message: Message<BI>): Message<BI> => {
        if (this.prefix !== undefined) {
            console.log(this.prefix, message)
        } else {
            console.log(message)
        }
        return message
    }
}
