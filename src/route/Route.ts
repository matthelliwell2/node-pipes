import { Condition } from '@divine/synchronization'
import { isMainThread } from 'worker_threads'
import type { Action, AsyncAction } from '../actions/Action'
import { SplittingAction } from '../actions/SplittingAction'
import type { Producer } from '../producers/Producer'
import { ThreadPoolOptions, WorkerThreadPool } from '../workers/WorkerThreadPool'
import { ActionNode, AsyncActionNode, SplittingActionNode } from './ActionNodes'
import type { BaseNode } from './BaseNode'
import { ProducerMetaData, ProducerNode } from './ProducerNode'

// TODO find way to only expose required methods
// TODO add message history tracing
// TODO exception handling/DLQ
// TODO add a wiretap?
// TODO send responses from work threads back to main thread so can aggregrate responses from threads
// TODO aggregator/batching mechanism, opposite of a splitter
export class Route {
    /**
     * If you are going to be using worker threads then pass in threadPoolOptions to control the threadpool. You must pass this option in if you want to use threads when
     * constructing the route in the main thread. In worker threads the parameter is ignored.
     */
    constructor(threadPoolOptions?: ThreadPoolOptions) {
        console.log(`Route constructor, isMainThread ${isMainThread}`)
        if (threadPoolOptions && isMainThread) {
            this.workerThreadPool = new WorkerThreadPool(this, threadPoolOptions, this.asyncWorkerFinished)
        }
    }

    private currentNodeId = 0

    get nextNodeId(): number {
        return ++this.currentNodeId
    }

    readonly workerThreadPool?: WorkerThreadPool

    /**
     * Trigger when all async tasks for an action are complete or when a thread in the thread pool has finished processing a message
     */
    readonly asyncWorkerFinished = new Condition()

    from<O, MO extends object>(producer: Producer<O, MO>): BaseNode<O, MO & ProducerMetaData> {
        const newNode = new ProducerNode(this, producer)
        this.producers.push(newNode)
        this.idToBaseNodeMap.set(newNode.id, newNode)
        return newNode
    }

    start(): void {
        if (this.workerThreadPool) {
            this.workerThreadPool.start()
        }

        this.producers.forEach(producer => producer.start())
    }

    /**
     * Stops the threads in the thread pool, discards any messages waiting to be processed and asks producers to stop producing messages. Pending messages may still be processed.
     * This may end up throwing errors
     */
    async stop(): Promise<void> {
        // Kill the thread pool
        if (this.workerThreadPool) {
            await this.workerThreadPool.stop()
        }

        // Ask produces to stop producing. This will cascade down to any async work pools and try and stop them as well
        this.producers.forEach(p => p.stop())
    }

    /**
     * Waits for any running async workers and threads to complete.
     */
    async waitForWorkersToFinish(): Promise<void> {
        while (this.isBusy) {
            // This will be notified when a thread completes processing or all the workers in an async worker pool have finished.
            await this.asyncWorkerFinished.wait()
        }
    }

    get isBusy(): boolean {
        if (this.workerThreadPool && isMainThread && this.workerThreadPool.isBusy) {
            return true
        }

        let isBusy = false
        this.asyncActionToAsyncNode.forEach(node => {
            if (node.isBusy) {
                isBusy = true
            }
        })

        return isBusy
    }

    /**
     * Actions are cached so if we add the same action twice to different parts of the route, we'll use the same node so they will have the same child links.
     */
    cacheAction<I, O, MI extends object, MO extends object = MI>(
        action: Action<I, O, MI, MO> | SplittingAction<I, O, MI, MO>
    ): ActionNode<I, O, MI, MO> | SplittingActionNode<I, O, MI, MO> {
        if (this.actionToNodeMap.has(action)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this.actionToNodeMap.get(action)!
        } else if (action instanceof SplittingAction) {
            const newNode = new SplittingActionNode(this, action)
            this.actionToNodeMap.set(action, newNode)
            this.idToBaseNodeMap.set(newNode.id, newNode)
            return newNode
        } else {
            const newNode = new ActionNode(this, action)
            this.actionToNodeMap.set(action, newNode)
            this.idToBaseNodeMap.set(newNode.id, newNode)

            return newNode
        }
    }

    cacheAsyncAction<I, O, MI extends object, MO extends object = MI>(action: AsyncAction<I, O, MI, MO>): AsyncActionNode<I, O, MI, MO> {
        if (this.asyncActionToAsyncNode.has(action)) {
            return this.asyncActionToAsyncNode.get(action) as AsyncActionNode<I, O, MI, MO>
        } else {
            const newNode = new AsyncActionNode(this, action)
            this.asyncActionToAsyncNode.set(action, newNode)
            this.idToBaseNodeMap.set(newNode.id, newNode)

            return newNode
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    getNode(id: number): BaseNode<any, any> {
        if (!this.idToBaseNodeMap.has(id)) {
            throw new Error(`Cannot find node with id ${id}`)
        }
        return this.idToBaseNodeMap.get(id)!
    }

    private readonly producers: ProducerNode<any, any>[] = []
    private readonly actionToNodeMap = new Map<
        Action<any, any, any, any> | SplittingAction<any, any, any, any>,
        ActionNode<any, any, any, any> | SplittingActionNode<any, any, any, any>
    >()
    private readonly asyncActionToAsyncNode = new Map<AsyncAction<any, any, any, any>, AsyncActionNode<any, any, any, any>>()
    private readonly idToBaseNodeMap = new Map<number, BaseNode<any, any>>()
}
