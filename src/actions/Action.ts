export interface Message<B, M extends object> {
    body: B
    metadata: M
}

export type AsyncOnMessage<I, O, MI extends object, MO extends object = MI> = (message: Message<I, MI>) => Promise<Message<O, MO> | undefined>
export type OnMessage<I, O, MI extends object, MO extends object = MI> = (message: Message<I, MI>) => Message<O, MO> | undefined

export interface Action<I, O, MI extends object = object, MO extends object = MI> {
    /**
     * The handler for a message. It receives the body as the first parameter. If the 2nd parameter is defined, it will be set to the metadata.
     * It can return
     *  - undefined if no further processing is to be done
     *  - a Message object containing a body to be passed to the children as the body and some new metadata.
     */
    onMessage: OnMessage<I, O, MI, MO>
}

export interface AsyncAction<I, O, MI extends object = object, MO extends object = MI> {
    onMessage: AsyncOnMessage<I, O, MI, MO>
}
