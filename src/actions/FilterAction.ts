import type { Action, AsyncAction, AsyncOnMessage, Message } from './Action'

export class FilterAction<BI, MI> implements Action<BI, MI, BI, MI> {
    constructor(private readonly predicate: (message: BI) => boolean) {}

    onMessage = (message: Message<BI, MI>): Message<BI, MI> | undefined => {
        return this.predicate(message.body) ? message : undefined
    }
}

export class AsyncFilterAction<BI, MI> implements AsyncAction<BI, MI, BI, MI> {
    constructor(private readonly predicate: (message: BI) => Promise<boolean>) {}

    onMessage: AsyncOnMessage<BI, MI, BI, MI> = async (message: Message<BI, MI>): Promise<Message<BI, MI> | undefined> => {
        return (await this.predicate(message.body)) ? message : undefined
    }
}
