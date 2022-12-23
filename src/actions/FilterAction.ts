import type { Action, AsyncAction, AsyncOnMessage, Message } from './Action'

export class FilterAction<BI> implements Action<BI, BI> {
    constructor(private readonly predicate: (message: BI) => boolean) {}

    onMessage = (message: Message<BI>): Message<BI> | undefined => {
        return this.predicate(message.body) ? message : undefined
    }
}

export class AsyncFilterAction<BI> implements AsyncAction<BI, BI> {
    constructor(private readonly predicate: (message: BI) => Promise<boolean>) {}

    onMessage: AsyncOnMessage<BI, BI> = async (message: Message<BI>): Promise<Message<BI> | undefined> => {
        return (await this.predicate(message.body)) ? message : undefined
    }
}
