import { isMainThread, threadId } from 'worker_threads'
import type { Action, AsyncAction, AsyncOnMessage, Message, OnMessage } from '../actions/Action'
import { InterceptAction, InterceptActionMetadata, Pushable } from '../actions/InterceptAction'
import { AsyncFilterAction, FilterAction } from '../actions/FilterAction'
import { LogAction } from '../actions/LogAction'
import { ActionResultThreadMessage, sendMessageToMainThread } from '../workers/RouteThread'
import type { MessageToWorker } from '../workers/WorkerThreadPool'
import type { ActionNode, AsyncActionNode } from './ActionNodes'
import type { Route } from './Route'

/**
 * BO - the output from the action contained in this node
 * MO - the metadata output from the action contained in this node
 */
export class BaseNode<BO, MO> {
    private runChildrenInWorkerThread = false
    private get runChildrenInMainThread(): boolean {
        return !this.runChildrenInWorkerThread
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly children: ActionNode<BO, MO, any, any>[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly asyncChildren: AsyncActionNode<BO, MO, any, any>[] = []

    /**
     * A unique id assigned to this node by the framework.
     */
    readonly id: number

    constructor(protected readonly route: Route) {
        this.id = route.nextNodeId
    }

    /**
     * Adds a synchronous action to a route
     */
    to<BO2, MO2 = MO>(actionOrFunc: Action<BO, MO, BO2, MO2> | OnMessage<BO, MO, BO2, MO2>): BaseNode<BO2, MO2> {
        if (typeof actionOrFunc === 'function') {
            const action: Action<BO, MO, BO2, MO2> = { onMessage: actionOrFunc }
            const newNode = this.route.cacheAction(action)
            this.children.push(newNode)
            return newNode
        } else {
            const newNode = this.route.cacheAction(actionOrFunc)
            this.children.push(newNode)
            return newNode
        }
    }

    /**
     * Add an async action to a route
     */
    toAsync<BO2, MO2 = MO>(actionOrFunc: AsyncAction<BO, MO, BO2, MO2> | AsyncOnMessage<BO, MO, BO2, MO2>): BaseNode<BO2, MO2> {
        if (typeof actionOrFunc === 'function') {
            const action: AsyncAction<BO, MO, BO2, MO2> = { onMessage: actionOrFunc }
            const newNode = this.route.cacheAsyncAction(action)
            this.asyncChildren.push(newNode)
            return newNode
        } else {
            const newNode = this.route.cacheAsyncAction(actionOrFunc)
            this.asyncChildren.push(newNode)
            return newNode
        }
    }

    log(prefix = ''): BaseNode<BO, MO> {
        const action = new LogAction<BO, MO>(prefix)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    filter(predicate: (input: BO) => boolean): BaseNode<BO, MO> {
        const action = new FilterAction<BO, MO>(predicate)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    asyncFilter(predicate: (input: BO) => Promise<boolean>): BaseNode<BO, MO> {
        const action = new AsyncFilterAction<BO, MO>(predicate)
        return this.toAsync(action)
    }

    /**
     * Adds messages to a queue or array and then passes the message unchanged to the next action
     */
    collect(collection: Pushable<Message<BO, MO>>): BaseNode<BO, MO & InterceptActionMetadata> {
        const action = new InterceptAction<BO, MO>(collection)
        return this.to(action)
    }

    /**
     * Add a split action to the route that will split an array or denq into individual messages
     * TODO get this to work. It should only be available if O is an array or queue
     */
    // split(): BaseNode<O> {
    //     const action = new ArraySplittingAction<O>()
    //     return this.to(action)
    // }

    /**
     * All subsequent actions will run in a worker thread until the end of the route or main() is called
     */
    worker(): BaseNode<BO, MO> {
        if (!this.route.workerThreadPool && isMainThread) {
            throw new Error('Invalid route - thread pool options must be passed to route constructor')
        }

        this.runChildrenInWorkerThread = true
        return this
    }

    /**
     * All subsequent actions will run in a main thread until the end of the route or worker() is called
     */
    main(): BaseNode<BO, MO> {
        this.runChildrenInWorkerThread = false
        return this
    }

    /**
     * Override this method to do any processing necessary for stopping and this call super.stop() incase any functionality is added to this in the future
     */
    async stop(): Promise<void> {}

    /**
     * Override this method to do any processing necessary for start and this call super.start() incase any functionality is added to this in the future
     */
    async start(): Promise<void> {}

    async sendMessageToChildren(message: Message<BO, MO>): Promise<void> {
        if (this.runChildrenInWorkerThread && isMainThread) {
            // Send the message to the workpool. The worker thread will need to know which action to execute so we need to pass the node id along with the message
            console.log('Route: Sending message to worker pool. msg:', message)
            const messageToThreads: MessageToWorker = { nodeId: this.id, message: message }
            await this.route.workerThreadPool?.push(messageToThreads)
        } else if (this.runChildrenInMainThread && !isMainThread) {
            // We're in a worker and want to run the actions in the main thread so we need to send a message back to the main thread
            const messageToMainThread: ActionResultThreadMessage = { nodeId: this.id, message: message, state: 'processing', threadId: threadId }
            sendMessageToMainThread(messageToMainThread)
        } else {
            // For async links we want to wait until all the messages have been accepted, but not processed, by the links
            const promises = this.asyncChildren.map(async link => link.onMessage(message))
            await Promise.all(promises)

            // Now process all the sychronous links. This may call other synchronous or async links before it returns.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            const p2 = this.children.map(async link => link.onMessage(message))
            await Promise.all(p2)
        }
    }
}
