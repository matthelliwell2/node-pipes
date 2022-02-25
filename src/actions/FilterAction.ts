import type { Action, AsyncAction, AsyncOnMessage, Message } from './Action'

export class FilterAction<I, MI extends object> implements Action<I, I, MI, MI> {
    constructor(private readonly predicate: (message: I) => boolean) {}

    onMessage = (message: Message<I, MI>): Message<I, MI> | undefined => {
        return this.predicate(message.body) ? message : undefined
    }
}

export class AsyncFilterAction<I, MI extends object> implements AsyncAction<I, I, MI, MI> {
    constructor(private readonly predicate: (message: I) => Promise<boolean>) {}

    onMessage: AsyncOnMessage<I, I, MI> = async (message: Message<I, MI>): Promise<Message<I, MI> | undefined> => {
        return (await this.predicate(message.body)) ? message : undefined
    }
}
