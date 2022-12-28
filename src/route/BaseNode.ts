import { isMainThread, threadId } from 'worker_threads'
import type { Action, AsyncAction, AsyncProcessBody, AsyncProcessMessage, Message, ProcessBody, ProcessMessage } from '../actions/Action'
import { InterceptAction, Pushable } from '../actions/InterceptAction'
import { AsyncFilterAction, FilterAction } from '../actions/FilterAction'
import { LogAction } from '../actions/LogAction'
import { ActionResultThreadMessage, sendMessageToMainThread } from '../workers/RouteThread'
import type { MessageToWorker } from '../workers/WorkerThreadPool'
import type { ActionNode, AsyncActionNode, AsyncNodeParams } from './ActionNodes'
import type { Route } from './Route'
import { actionFromProcessBody, actionFromProcessMessage, asyncActionFromProcessBody, asyncActionFromProcessMessage } from '../actions/Action'

/**
 * BO - the output from the action contained in this node
 * MO - the metadata output from the action contained in this node
 */
export class BaseNode<BO> {
    private runChildrenInWorkerThread = false
    private get runChildrenInMainThread(): boolean {
        return !this.runChildrenInWorkerThread
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly children: ActionNode<BO, any>[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly asyncChildren: AsyncActionNode<BO, any>[] = []

    /**
     * A unique id assigned to this node by the framework.
     */
    readonly id: number

    constructor(protected readonly route: Route) {
        this.id = route.nextNodeId
    }

    /**
     * Append a synchronous action to this node. The output from this node from the input to this action. There are
     * three possible inputs:
     * 1. An Action object. This is usful if you action needs to do more than just process the message, eg maintain
     *    state between calls.
     * 2. A function which takes a Message object and returns a message object. Use this is iseful if you need to access the
     *    metadata for the route. Note the second parameter that you have to pass in as true in this case. This is just
     *    to get around Typescript overloading not being able to distinguish between cases 2 and 3 as they both just
     *    take a function.
     * 3. A function which just takes message body and returns a message body. You can use this for most simple cases.
     *    The framework will automatically pass the metadata onto the child action unchanged.
     *
     * @template BO - the type of the output from this node which will be passed to the action
     * @template BO2 - the output type of this action
     *
     * Returns a new Node to which you can add more actions.
     */
    to<BO2>(actionOrFunc: Action<BO, BO2>): BaseNode<BO2>
    to<BO2>(actionOrFunc: ProcessMessage<BO, BO2>, handleMetadata: true): BaseNode<BO2>
    to<BO2>(actionOrFunc: ProcessBody<BO, BO2>, handleMetadata: false): BaseNode<BO2>
    to<BO2>(actionOrFunc: Action<BO, BO2> | ProcessMessage<BO, BO2> | ProcessBody<BO, BO2>, handleMetadata = false): BaseNode<BO2> {
        if (typeof actionOrFunc === 'function') {
            const action = handleMetadata ? actionFromProcessMessage(actionOrFunc as ProcessMessage<BO, BO2>) : actionFromProcessBody(actionOrFunc as ProcessBody<BO, BO2>)

            const newNode = this.route.getAction(action)
            this.children.push(newNode)
            return newNode
        } else {
            const newNode = this.route.getAction(actionOrFunc)
            this.children.push(newNode)
            return newNode
        }
    }

    /**
     * Add an async action to a route
     */
    toAsync<BO2>(actionOrFunc: AsyncAction<BO, BO2>, params?: AsyncNodeParams): BaseNode<BO2>
    toAsync<BO2>(actionOrFunc: AsyncProcessMessage<BO, BO2>, params: AsyncNodeParams & { handleMetadata: true }): BaseNode<BO2>
    toAsync<BO2>(actionOrFunc: AsyncProcessBody<BO, BO2>, params: AsyncNodeParams & { handleMetadata: false }): BaseNode<BO2>
    toAsync<BO2>(
        actionOrFunc: AsyncAction<BO, BO2> | AsyncProcessMessage<BO, BO2> | AsyncProcessBody<BO, BO2>,
        params: AsyncNodeParams & { handleMetadata?: boolean }
    ): BaseNode<BO2> {
        if (typeof actionOrFunc === 'function') {
            const action =
                params.handleMetadata === true
                    ? asyncActionFromProcessMessage(actionOrFunc as AsyncProcessMessage<BO, BO2>)
                    : asyncActionFromProcessBody(actionOrFunc as AsyncProcessBody<BO, BO2>)

            const newNode = this.route.getAsyncNode(action, params)
            this.asyncChildren.push(newNode)
            return newNode
        } else {
            const newNode = this.route.getAsyncNode(actionOrFunc, params)
            this.asyncChildren.push(newNode)
            return newNode
        }
    }

    log(prefix = ''): BaseNode<BO> {
        const action = new LogAction<BO>(prefix)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    // TODO add examples for the filter action
    filter(predicate: (input: BO) => boolean): BaseNode<BO> {
        const action = new FilterAction<BO>(predicate)
        return this.to(action)
    }

    /**
     * Applies a synchronous filter to a message, passing the message on if the predicate returns true
     */
    asyncFilter(predicate: (input: BO) => Promise<boolean>, params?: AsyncNodeParams): BaseNode<BO> {
        const action = new AsyncFilterAction<BO>(predicate)
        return this.toAsync(action, params)
    }

    /**
     * Adds messages to a queue or array and then passes the message unchanged to the next action
     */
    collect(collection: Pushable<Message<BO>>): BaseNode<BO> {
        const action = new InterceptAction<BO>(collection)
        return this.to(action)
    }
    // TODO allow collecting bodies only
    // collectBodies(collection: Pushable<BO>): BaseNode<BO> {
    //     const action = new InterceptAction<BO>(collection)
    //     return this.to(action)
    // }
    /**
     * Add a split action to the route that will split an array or denq into individual messages
     * TODO get this to work. It should only be available if O is an array or queue
     */
    // split<A extends Array<BO>>(): BaseNode<A, MO> {
    //     const action = new ArraySplittingAction<BO, MO>()
    //     return this.to(action)
    // }

    /**
     * All subsequent actions will run in a worker thread until the end of the route or main() is called
     */
    worker(): BaseNode<BO> {
        if (!this.route.workerThreadPool && isMainThread) {
            throw new Error('Invalid route - thread pool options must be passed to route constructor')
        }

        this.runChildrenInWorkerThread = true
        return this
    }

    /**
     * All subsequent actions will run in a main thread until the end of the route or worker() is called
     */
    main(): BaseNode<BO> {
        this.runChildrenInWorkerThread = false
        return this
    }

    /**
     * Override this method to do any processing necessary for stopping and this call super.stop() in case any
     * functionality is added to this in the future
     */
    async stop(): Promise<void> {}

    /**
     * Override this method to do any processing necessary for start and this call super.start() in case any
     * functionality is added to this in the future
     */
    async start(): Promise<void> {}

    async sendMessageToChildren(message: Message<BO>): Promise<void> {
        if (this.runChildrenInWorkerThread && isMainThread) {
            // Send the message to the workerpool. The worker thread will need to know which action to execute so we need to pass the node id along with the message
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

            // Now process all the synchronous links. This may call other synchronous or async links before it returns
            // so it has to return a promise
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            const p2 = this.children.map(async link => link.onMessage(message))
            await Promise.all(p2)
        }
    }
}
