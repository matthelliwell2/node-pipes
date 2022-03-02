import type { Action, AsyncAction, Message } from '../actions/Action'
import { AsyncWorkerPool } from '../workers/AsyncWorkerPool'
import { BaseNode } from './BaseNode'
import type { Route } from './Route'

/**
 * Contains an action object and a list of child nodes. It invokes the action object when a new message is received and passes the results to child node.
 */
export class ActionNode<I, O, MI extends object, MO extends object = MI> extends BaseNode<O, MO> {
    constructor(route: Route, private readonly action: Action<I, O, MI, MO>) {
        super(route)
    }

    onMessage = async (input: Message<I, MI>): Promise<void> => {
        const output = this.action.onMessage(input)

        if (output !== undefined) {
            await this.sendMessageToChildren(output)
        }
    }

    private readonly emitted = async (message: Message<O, MO>): Promise<void> => {
        await this.sendMessageToChildren(message)
    }

    override async start(): Promise<void> {
        if (typeof this.action.start === 'function') {
            await this.action.start(this.emitted)
        }
        await super.start()
    }
}

export class AsyncActionNode<I, O, MI extends object, MO extends object = MI> extends BaseNode<O, MO> {
    private readonly workerPool: AsyncWorkerPool<I, O, MI, MO>

    constructor(route: Route, private readonly action: AsyncAction<I, O, MI, MO>) {
        super(route)
        // TODO make concurrency and queue size configurable
        // Unlike a thread, a worker pool does not need to start so we can just create it in the constructor
        this.workerPool = new AsyncWorkerPool(this.invokeAction, 2, 2, route.asyncWorkerFinished)
    }

    onMessage = async (message: Message<I, MI>): Promise<{ result: Promise<Message<O, MO> | undefined> }> => {
        return this.workerPool.push(message)
    }

    private readonly emitted = async (message: Message<O, MO>): Promise<void> => {
        await this.sendMessageToChildren(message)
    }

    get isBusy(): boolean {
        return this.workerPool.isBusy
    }

    override async stop(): Promise<void> {
        this.workerPool.stop()
        if (typeof this.action.stop === 'function') {
            await this.action.stop()
        }
        await super.stop()
    }

    // eslint-disable-next-line sonarjs/no-identical-functions
    override async start(): Promise<void> {
        if (typeof this.action.start === 'function') {
            await this.action.start(this.emitted)
        }
        await super.start()
    }

    private readonly invokeAction = async (message: Message<I, MI>): Promise<Message<O, MO> | undefined> => {
        const output = await this.action.onMessage(message)
        if (output) {
            await this.sendMessageToChildren(output)
        }

        return output
    }
}
