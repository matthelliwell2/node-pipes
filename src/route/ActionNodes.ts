import type { Action, AsyncAction, Message } from '../actions/Action'
import { AsyncWorkerPool } from '../workers/AsyncWorkerPool'
import { BaseNode } from './BaseNode'
import type { Route } from './Route'

/**
 * Contains an action object and a list of child nodes. It invokes the action object when a new message is received and
 * passes the results to child node.
 */
export class ActionNode<BI, BO> extends BaseNode<BO> {
    constructor(route: Route, private readonly action: Action<BI, BO>) {
        super(route)
    }

    onMessage = async (input: Message<BI>): Promise<void> => {
        const output = this.action.onMessage(input)

        if (Array.isArray(output)) {
            for (const msg of output) {
                await this.sendMessageToChildren(msg)
            }
        } else if (output !== undefined) {
            await this.sendMessageToChildren(output)
        }
    }

    private readonly emitted = async (message: Message<BO>): Promise<void> => {
        await this.sendMessageToChildren(message)
    }

    override async start(): Promise<void> {
        if (typeof this.action.start === 'function') {
            await this.action.start(this.emitted)
        }
        await super.start()
    }
}

export interface AsyncNodeParams {
    bufferSize?: number
    concurrency?: number
}

/**
 * A node on a route containg an async action. It manages a pool and queue to control the async functions.
 */
export class AsyncActionNode<BI, BO> extends BaseNode<BO> {
    private readonly workerPool: AsyncWorkerPool<BI, BO>

    constructor(route: Route, private readonly action: AsyncAction<BI, BO>, params: AsyncNodeParams) {
        super(route)
        // TODO make concurrency and queue size configurable
        // Unlike a thread, a worker pool does not need to start so we can just create it in the constructor
        this.workerPool = new AsyncWorkerPool(this.invokeAction, params.concurrency ?? 2, params.bufferSize ?? 2, route.asyncWorkerFinished)
    }

    onMessage = async (message: Message<BI>): Promise<{ result: Promise<Message<BO> | Message<BO>[] | undefined> }> => {
        return this.workerPool.push(message)
    }

    private readonly emitted = async (message: Message<BO>): Promise<void> => {
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

    private readonly invokeAction = async (message: Message<BI>): Promise<Message<BO> | Message<BO>[] | undefined> => {
        const output = await this.action.onMessage(message)
        if (Array.isArray(output)) {
            for (const msg of output) {
                await this.sendMessageToChildren(msg)
            }
        } else if (output) {
            await this.sendMessageToChildren(output)
        }

        return output
    }
}
