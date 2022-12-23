/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-explicit-any */
import { Condition, Queue } from '@divine/synchronization'
import { MessageChannel, Worker } from 'worker_threads'
import type { Message } from '../actions/Action'
import type { Route } from '../route/Route'
import type { MessageToMainThread } from './RouteThread'

// TODO clean up logging
// TODO decent class/function level docs
export interface ThreadPoolOptions {
    concurrency: number
    bufferSize: number
    filename: string
}

export interface MessageToWorker {
    nodeId: number
    message: Message<unknown>
}

export class WorkerThreadPool {
    private started = false
    private readonly buffer: Queue<MessageToWorker>
    private readonly workers: ThreadManager[] = []
    private readonly workerFinishedCondition = new Condition()

    /**
     * @param options
     * @param externalWorkerFinishedCondition Notified when a thread has finished it's processing. You can use this condition with the isBusy property to wait until all
     * threads are complete
     * @param route Reference to route, used for routing messages from worker threads back to main thread
     */
    constructor(private readonly route: Route, private readonly options: ThreadPoolOptions, private readonly externalWorkerFinishedCondition: Condition) {
        if (this.options.bufferSize < 1) {
            throw new Error(`Buffer size of ${options.bufferSize} is not valid, it must be greater than or equal to one.`)
        }

        if (this.options.concurrency < 1) {
            throw new Error(`Concurrency of ${options.concurrency} is not valid, it must be greater than or equal to one.`)
        }

        this.buffer = new Queue<MessageToWorker>(this.options.bufferSize)
    }

    start() {
        console.log('WorkerThreadPool.start')
        if (this.started) {
            throw new Error('Start has already been called on WorkerThreadPool')
        }

        for (let i = 0; i < this.options.concurrency; ++i) {
            this.workers.push(new ThreadManager(this.options.filename, this.route, this.workerFinishedCondition, this.externalWorkerFinishedCondition))
        }

        this.started = true
    }

    async stop(): Promise<void> {
        if (!this.started) {
            console.warn('Calling stop threadpool that is not start - ignored')
            return
        }

        await Promise.all(this.workers.map(async worker => worker.stop()))
        this.workers.length = 0

        while (this.buffer.length > 0) {
            this.buffer.shift()
        }
        this.started = false
    }

    get isBusy(): boolean {
        return !this.buffer.isEmpty() || this.workers.find(worker => worker.isBusy) !== undefined
    }

    /**
     * Queue a message to procesing in another thread. There promise completes when the message is queued. If the queue is full because all the workers are busy and other messages
     * are already queued then the caller wait in the promise before trying to push another message.
     * @param msg
     */
    async push(msg: MessageToWorker): Promise<void> {
        await this.buffer.pushOrWait(msg)
        return this.processNextMessage()
    }

    private async processNextMessage(): Promise<void> {
        if (this.buffer.isEmpty()) {
            throw new Error('Message queue is empty')
        }

        let freeWorker = this.nextFreeWorker
        if (freeWorker) {
            const nextMsg = this.buffer.shift()!
            freeWorker.sendMessage(nextMsg)
        } else {
            await this.workerFinishedCondition.wait()
            const nextMsg = this.buffer.shift()!
            freeWorker = this.nextFreeWorker
            if (!freeWorker) {
                throw new Error('Cannot find a free worker')
            }
            freeWorker.sendMessage(nextMsg)
        }
    }

    private get nextFreeWorker(): ThreadManager | undefined {
        // TODO does it matter that we use threads from the start of the list more often?
        return this.workers.find(worker => !worker.isBusy)
    }
}

class ThreadManager {
    private readonly worker: Worker
    private readonly channel: MessageChannel

    // TODO make readonly to external classes?
    // The thread is initially busy until we get a message to show that it has been initialised
    constructor(filename: string, private readonly route: Route, private readonly workerNotBusyCondition: Condition, private readonly externalWorkerFinishedCondition: Condition) {
        this.worker = new Worker(filename)
        this.channel = new MessageChannel()

        this.worker.postMessage(this.channel.port1, [this.channel.port1])
        this.channel.port2.on('message', this.onMessage)
    }

    isBusy = true

    sendMessage(msg: MessageToWorker) {
        console.log(new Date().toISOString(), 'TheadManager.sendMessage to thread', this.worker.threadId)
        this.isBusy = true
        this.worker.postMessage(msg)
    }

    async stop(): Promise<void> {
        await this.worker.terminate()
    }

    private readonly onMessage = (value: MessageToMainThread) => {
        console.log(new Date().toISOString(), 'MAIN received message from thread', value.threadId, value.state)
        switch (value.state) {
            case 'initialised':
                // The thread is initially busy while it initialises. Once we get this message, it is ready to be sent messages
                this.isBusy = false
                this.workerNotBusyCondition.notify()
                break
            case 'processing': {
                const action = this.route.getNode(value.nodeId)
                void action.sendMessageToChildren(value.message)
                break
            }
            case 'finished':
                this.isBusy = false
                this.workerNotBusyCondition.notify()
                this.externalWorkerFinishedCondition.notifyAll()
                break
        }
    }

    // TODO handle events error, exit, messageerror
}
