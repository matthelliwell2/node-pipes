import { Condition } from '@divine/synchronization'
import { isMainThread } from 'worker_threads'
import type { Action, AsyncAction, Emitter } from '../actions/Action'
import { ThreadPoolOptions, WorkerThreadPool } from '../workers/WorkerThreadPool'
import { ActionNode, AsyncActionNode, AsyncNodeParams } from './ActionNodes'
import type { BaseNode } from './BaseNode'
import { ProducerNode } from './ProducerNode'

// TODO find way to only expose required methods
// TODO add message history tracing
// TODO exception handling/DLQ
// TODO add a wiretap?
// TODO send responses from work threads back to main thread so can aggregate responses from threads
// TODO aggregator/batching mechanism, opposite of a splitter
/**
 * Holds are route. The route is made up of a number of nodes and a thread pool of worker threads. Each node contains
 * an action that can receive and emit messages.
 */
export class Route {
    /**
     * If you are going to be using worker threads then pass in threadPoolOptions to control the thread pool. when
     * constructing the route in the main thread, you must pass this option in if you want to use threads. In worker
     * threads the parameter is ignored.
     */
    constructor(threadPoolOptions?: ThreadPoolOptions) {
        console.log(`Route constructor, isMainThread ${isMainThread}`)
        if (threadPoolOptions && isMainThread) {
            this.workerThreadPool = new WorkerThreadPool(this, threadPoolOptions, this.asyncWorkerFinished)
        }
    }

    private currentNodeId = 0

    /**
     * Each node in a route is given a unique id. This is used with work threads to keep track of which nodes should
     * execute their actions in which threads.
     */
    get nextNodeId(): number {
        return ++this.currentNodeId
    }

    /**
     * The pool of worker threads used when running a multithreaded route.
     */
    readonly workerThreadPool?: WorkerThreadPool

    /**
     * Trigger when all async tasks for an action are complete or when a thread in the thread pool has finished
     * processing a message. It is used to apply back pressure so messages don't get backed up.
     */
    readonly asyncWorkerFinished = new Condition()

    /**
     * The starting point for a route. A producer is a node that just emits messages without receiving any.
     * @param producer
     */
    from<O>(producer: Emitter<O>): BaseNode<O> {
        const newNode = new ProducerNode(this, producer)
        this.producers.push(newNode)
        this.idToBaseNodeMap.set(newNode.id, newNode)
        return newNode
    }

    /**
     * Starts the route.
     */
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

        // Start the producers last, so they don't start producing messages until the rest of the route is initialised
        this.producers.forEach(producer => {
            promises.push(producer.start())
        })
        await Promise.all(promises)
    }

    /**
     * Stops the threads in the thread pool, discards any messages waiting to be processed and asks producers to stop
     * producing messages. Pending messages may still be processed. This may end up throwing errors
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

        // Start the producers last, so they don't start producing messages until the rest of the route is initialised
        this.producers.forEach(producer => {
            promises.push(producer.stop())
        })
        await Promise.all(promises)
    }

    /**
     * Flushes any actions and waits for any running async workers and threads to complete. Because a call to flush
     * mught result is more data that needs to be flushed, we have to loop around until there is nothing left to
     * flush.
     */
    async waitForWorkersToFinish(): Promise<void> {
        let dataFlushed = true
        while (dataFlushed) {
            dataFlushed = await this.flush()
            while (this.isBusy) {
                // This will be notified when a thread completes processing or all the workers in an async worker pool
                // have finished.
                await this.asyncWorkerFinished.wait()
            }
        }
    }

    /**
     * Calls flush on all the async nodes.
     * @return true if any of the flush calls returned true
     */
    async flush(): Promise<boolean> {
        const promises: Promise<boolean>[] = []
        this.asyncActionToAsyncNode.forEach(node => {
            promises.push(node.flush())
        })

        const results = await Promise.all(promises)
        return results.includes(true)
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
     * Actions are cached so if we add the same action twice to different parts of the route, we'll use the same node
     * so they will have the same child links.
     */
    getAction<BI, BO>(action: Action<BI, BO>): ActionNode<BI, BO> {
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

    getAsyncNode<BI, BO>(action: AsyncAction<BI, BO>, params?: AsyncNodeParams): AsyncActionNode<BI, BO> {
        if (this.asyncActionToAsyncNode.has(action)) {
            return this.asyncActionToAsyncNode.get(action) as AsyncActionNode<BI, BO>
        } else {
            const newNode = new AsyncActionNode(this, action, params)
            this.asyncActionToAsyncNode.set(action, newNode)
            this.idToBaseNodeMap.set(newNode.id, newNode)

            return newNode
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    getNode(id: number): BaseNode<any> {
        if (!this.idToBaseNodeMap.has(id)) {
            throw new Error(`Cannot find node with id ${id}`)
        }
        return this.idToBaseNodeMap.get(id)!
    }

    private readonly producers: ProducerNode<any>[] = []
    private readonly actionToNodeMap = new Map<Action<any, any>, ActionNode<any, any>>()
    private readonly asyncActionToAsyncNode = new Map<AsyncAction<any, any>, AsyncActionNode<any, any>>()
    private readonly idToBaseNodeMap = new Map<number, BaseNode<any>>()
}
