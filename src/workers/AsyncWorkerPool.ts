import { Condition, Queue } from '@divine/synchronization'
import type { Message } from '../actions/Action'

export type Worker<I, O, MI, MO = MI> = (input: Message<I, MI>) => Promise<Message<O, MO> | undefined>

/**
 * Provides a pool of workers for processing asynchronous messages. The processing is limited to a fixed number of
 * messages that can be processed in parallel. In addition there is a queue that can be used to buffer messages if
 * there are too many messages already being processed. The queue is blocking so you should await on the result of the
 * push.
 *
 * <BI> - The type of message that is processed
 * <BO> - the type of object returned by the message processing
 */
export class AsyncWorkerPool<BI, MI, BO, MO = MI> {
    private readonly buffer: Queue<Message<BI, MI>>
    private count = 0
    private readonly workerFinishedCondition = new Condition()

    /**
     * @param worker The function that will be called for each message
     * @param concurrency The maximum number of workers that will be running in parallel
     * @param bufferSize The maximum number of messages that can be queued awaiting processing
     * @param allWorkersFinishedCondition A condition to be notified when a worker finished. This allows external
     *     callers to keep track if any workers are running.
     */
    constructor(
        private readonly worker: Worker<BI, BO, MI, MO>,
        private readonly concurrency: number,
        bufferSize: number,
        private readonly allWorkersFinishedCondition: Condition
    ) {
        if (bufferSize < 1) {
            throw new Error(`Buffer size of ${bufferSize} is not valid, it must be greater than or equal to one.`)
        }

        if (this.concurrency < 1) {
            throw new Error(`Concurrency of ${concurrency} is not valid, it must be greater than or equal to one.`)
        }
        this.buffer = new Queue<Message<BI, MI>>(bufferSize)
    }

    get bufferSize(): number {
        return this.buffer.length
    }

    get runningCount(): number {
        return this.count
    }

    get isBusy(): boolean {
        return this.bufferSize > 0 || this.runningCount > 0
    }

    stop(): void {
        while (this.buffer.length > 0) {
            this.buffer.shift()
        }
    }

    /**
     * Returns a promise that resolves when the message is added to the queue. The promise resolves to another promise
     * that has the result of the processing the message.
     */
    async push(message: Message<BI, MI>): Promise<{ result: Promise<Message<BO, MO> | undefined> }> {
        const queuePromise = this.buffer.pushOrWait(message)
        // We need to return a promise that will resolve once the item is on the queue so that when the queue is full
        // we can apply some back pressure.
        return new Promise((resolve, reject) => {
            queuePromise
                .then(() => {
                    // We need to let the caller get the value from the message processing. So we return anothe promise
                    // that resolves to this value. But we can't just return a promise in a promise as these will just
                    // get flatten out at runtime so the caller wouldn't be able to wait on the queue insert seperately
                    // from the processing. Therefore we have to return a structure inside the promise so the caller
                    // can do: const worker = await pool.push('abc') const result = await worker.promise
                    const p = this.processNextMessage()
                    resolve({ result: p })
                })
                .catch(err => {
                    reject(err)
                })
        })
    }

    /**
     * This there is a message on the queue then it will try and pass it to a worker. If there are no free workers then
     * it will wait unil there are.
     */
    private async processNextMessage(): Promise<Message<BO, MO> | undefined> {
        // This should only be called when something has been added to the queue so if there queue is empty something
        // has gone wrong
        if (this.buffer.isEmpty()) {
            throw new Error('Message queue is empty')
        }

        console.log('Async worker pool, processNextMessage, buffer length', this.buffer.length)

        if (this.count < this.concurrency) {
            // We've got a free work so take the message from the queue and pass it to a worker. This will free up a
            // slot on the queue so anything waiting to push a message on the queue will now resolve
            const nextMsg = this.buffer.shift()!
            return this.runWorker(nextMsg)
        } else {
            // There are no free workers so we wait until we're notified that there is capacity
            await this.workerFinishedCondition.wait()
            // Don't take the message from the queue until we are ready to process it otherwise another message can be
            // put on the queue and we'll have no back pressure.
            const nextMsg = this.buffer.shift()!
            return this.runWorker(nextMsg)
        }
    }

    /**
     * Calls the worker function for a message and notifies a waiter once it is complete.
     */
    private async runWorker(msg: Message<BI, MI>): Promise<Message<BO, MO> | undefined> {
        ++this.count
        const result = await this.worker(msg)
        --this.count
        // A worker is complete so notify a waiter that it can now process the message from the queue
        this.workerFinishedCondition.notify()

        // Notify any external waiter than all the workers have finished
        if (this.count === 0) {
            this.allWorkersFinishedCondition.notifyAll()
        }
        return result
    }
}
