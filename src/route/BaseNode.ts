import { isMainThread, threadId } from 'worker_threads'
import type { Action, AsyncAction, AsyncOnMessage, Message, OnMessage } from '../actions/Action'
import { CollectionAction, CollectionActionMetadata, Pushable } from '../actions/CollectionAction'
import { AsyncFilterAction, FilterAction } from '../actions/FilterAction'
import { LogAction } from '../actions/LogAction'
import { ActionResultThreadMessage, sendMessageToMainThread } from '../workers/RouteThread'
import type { MessageToWorker } from '../workers/WorkerThreadPool'
import type { ActionNode, AsyncActionNode } from './ActionNodes'
import type { Route } from './Route'

/**
 * O - the output from the action contained in this node
 * MO - the metadata output from the action contained in this node
 */
export class BaseNode<O, MO extends object> {
    private runChildrenInWorkerThread = false
    private get runChildrenInMainThread(): boolean {
        return !this.runChildrenInWorkerThread
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly children: ActionNode<O, any, MO, any>[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly asyncChildren: AsyncActionNode<O, any, MO, any>[] = []

    readonly id: number

    constructor(protected readonly route: Route) {
        this.id = route.nextNodeId
    }

    /**
     * Adds a synchronous action to a route
     */
    to<O2, MO2 extends object = MO>(actionOrFunc: Action<O, O2, MO, MO2> | OnMessage<O, O2, MO, MO2>): BaseNode<O2, MO2> {
        if (typeof actionOrFunc === 'function') {
            const action: Action<O, O2, MO, MO2> = { onMessage: actionOrFunc }
            const newNode = this.route.cacheAction(action)
            this.children.push(newNode)
            return newNode
        } else {
            const newNode = this.route.cacheAction(actionOrFunc)
            // const newNode = new ActionNode(this.route, actionOrFunc)
            this.children.push(newNode)
            return newNode
        }
    }

    /**
     * Add an async action to a route
     */
    toAsync<O2, MO2 extends object = MO>(actionOrFunc: AsyncAction<O, O2, MO, MO2> | AsyncOnMessage<O, O2, MO, MO2>): BaseNode<O2, MO2> {
        if (typeof actionOrFunc === 'function') {
            const action: AsyncAction<O, O2, MO, MO2> = { onMessage: actionOrFunc }
            const newNode = this.route.cacheAsyncAction(action)
            this.asyncChildren.push(newNode)
            return newNode
        } else {
            const newNode = this.route.cacheAsyncAction(actionOrFunc)
            this.asyncChildren.push(newNode)
            return newNode
        }
    }

    log(prefix = ''): BaseNode<O, MO> {
        const action = new LogAction<O, MO>(prefix)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    filter(predicate: (input: O) => boolean): BaseNode<O, MO> {
        const action = new FilterAction<O, MO>(predicate)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    asyncFilter(predicate: (input: O) => Promise<boolean>): BaseNode<O, MO> {
        const action = new AsyncFilterAction<O, MO>(predicate)
        return this.toAsync(action)
    }

    /**
     * Adds messages to a queue or array and then passes the message unchanged to the next action
     */
    collect(collection: Pushable<Message<O, MO>>): BaseNode<O, MO & CollectionActionMetadata> {
        const action = new CollectionAction<O, MO>(collection)
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
    worker(): BaseNode<O, MO> {
        if (!this.route.workerThreadPool && isMainThread) {
            throw new Error('Invalid route - thread pool options must be passed to route constructor')
        }

        this.runChildrenInWorkerThread = true
        return this
    }

    /**
     * All subsequent actions will run in a main thread until the end of the route or worker() is called
     */
    main(): BaseNode<O, MO> {
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

    async sendMessageToChildren(message: Message<O, MO>): Promise<void> {
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
