import Denque from 'denque'
import type { Action, AsyncAction, Message } from '../actions/Action'
import type { SplittingAction } from '../actions/SplittingAction'
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
}

export class SplittingActionNode<I, O, MI extends object, MO extends object = MI> extends BaseNode<O, MO> {
    private readonly messages = new Denque<Message<O, MO>>()
    constructor(route: Route, private readonly action: SplittingAction<I, O, MI, MO>) {
        super(route)
        action.emit = this.emitted
    }

    onMessage = async (input: Message<I, MI>): Promise<void> => {
        this.messages.clear()
        this.action.onMessage(input)
        while (!this.messages.isEmpty()) {
            const message = this.messages.shift()!
            await this.sendMessageToChildren(message)
        }
    }

    private readonly emitted = async (output: Message<O, MO>): Promise<void> => {
        this.messages.push(output)
    }
}

export class AsyncActionNode<I, O, MI extends object, MO extends object = MI> extends BaseNode<O, MO> {
    private readonly workerPool: AsyncWorkerPool<I, O, MI, MO>

    constructor(route: Route, private readonly action: AsyncAction<I, O, MI, MO>) {
        super(route)
        // TODO make concurrency and queue size configurable
        this.workerPool = new AsyncWorkerPool(this.invokeAction, 2, 2, route.asyncWorkerFinished)
    }

    onMessage = async (message: Message<I, MI>): Promise<{ result: Promise<Message<O, MO> | undefined> }> => {
        return this.workerPool.push(message)
    }

    get isBusy(): boolean {
        return this.workerPool.isBusy
    }

    override stop(): void {
        this.workerPool.stop()
        super.stop()
    }

    private readonly invokeAction = async (message: Message<I, MI>): Promise<Message<O, MO> | undefined> => {
        const output = await this.action.onMessage(message)
        if (output) {
            await this.sendMessageToChildren(output)
        }

        return output
    }
}
