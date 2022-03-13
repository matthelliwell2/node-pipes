import { Condition } from '@divine/synchronization'
import { isMainThread } from 'worker_threads'
import type { Action, AsyncAction, Emitter } from '../actions/Action'
import { ThreadPoolOptions, WorkerThreadPool } from '../workers/WorkerThreadPool'
import { ActionNode, AsyncActionNode } from './ActionNodes'
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

    from<O, MO>(producer: Emitter<O, MO>): BaseNode<O, MO & ProducerMetaData> {
        const newNode = new ProducerNode(this, producer)
        this.producers.push(newNode)
        this.idToBaseNodeMap.set(newNode.id, newNode)
        return newNode
    }

    async start(): Promise<void> {
        if (this.workerThreadPool) {
            this.workerThreadPool.start()
        }

        const promises: Promise<unknown>[] = []
        this.actionToNodeMap.forEach(node => {
            promises.push(node.start())
        })

        await Promise.all(promises)
        promises.length = 0

        this.asyncActionToAsyncNode.forEach(node => {
            promises.push(node.start())
        })

        await Promise.all(promises)
        promises.length = 0

        // Start the producers last so they don't start producing messages until the rest of the route is initialised
        this.producers.forEach(producer => {
            promises.push(producer.start())
        })
        await Promise.all(promises)
    }

    /**
     * Stops the threads in the thread pool, discards any messages waiting to be processed and asks producers to stop producing messages. Pending messages may still be processed.
     * This may end up throwing errors
     */
    async stop(): Promise<void> {
        if (this.workerThreadPool) {
            await this.workerThreadPool.stop()
        }

        const promises: Promise<unknown>[] = []
        this.actionToNodeMap.forEach(node => {
            promises.push(node.stop())
        })

        await Promise.all(promises)
        promises.length = 0

        this.asyncActionToAsyncNode.forEach(node => {
            promises.push(node.stop())
        })

        await Promise.all(promises)
        promises.length = 0

        // Start the producers last so they don't start producing messages until the rest of the route is initialised
        this.producers.forEach(producer => {
            promises.push(producer.stop())
        })
        await Promise.all(promises)
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
    cacheAction<BI, MI, BO, MO = MI>(action: Action<BI, MI, BO, MO>): ActionNode<BI, MI, BO, MO> {
        if (this.actionToNodeMap.has(action)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this.actionToNodeMap.get(action)!
        } else {
            const newNode = new ActionNode(this, action)
            this.actionToNodeMap.set(action, newNode)
            this.idToBaseNodeMap.set(newNode.id, newNode)

            return newNode
        }
    }

    cacheAsyncAction<BI, MI, BO, MO = MI>(action: AsyncAction<BI, MI, BO, MO>): AsyncActionNode<BI, MI, BO, MO> {
        if (this.asyncActionToAsyncNode.has(action)) {
            return this.asyncActionToAsyncNode.get(action) as AsyncActionNode<BI, MI, BO, MO>
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
    private readonly actionToNodeMap = new Map<Action<any, any, any, any>, ActionNode<any, any, any, any>>()
    private readonly asyncActionToAsyncNode = new Map<AsyncAction<any, any, any, any>, AsyncActionNode<any, any, any, any>>()
    private readonly idToBaseNodeMap = new Map<number, BaseNode<any, any>>()
}
