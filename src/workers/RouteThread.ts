import { MessagePort, parentPort, threadId } from 'worker_threads'
import type { Message } from '../actions/Action'
import type { Route } from '../route/Route'
import type { MessageToWorker } from './WorkerThreadPool'

console.log('Starting worker thread', threadId)

/**
 * This is the code that is run as a worker thread. Uses create their own file which includes this one and calls the register function.
 */

let port: MessagePort
let route: Route

export interface ActionResultThreadMessage<B = unknown, M extends object = object> {
    threadId: number
    state: 'processing'

    /**
     * The id of the node that produced the message so the threads needs to pass the message to all children of this node
     */
    nodeId: number
    message: Message<B, M>
}

interface StateChangeThreadMessage {
    threadId: number

    /**
     * The state of the worker thread
     *  - intialised: the thread is initialised and ready to process messages
     *  - finished: the thread has completed processing the last message it was sent and it ready to process another
     *  - processing: the thread is returning the result of an action by to the main thread but might still be running other actions
     */
    state: 'initialised' | 'finished'
    info: string
}

export type MessageToMainThread = StateChangeThreadMessage | ActionResultThreadMessage

parentPort?.on('message', (value: MessageToWorker | MessagePort): void => {
    if (value instanceof MessagePort) {
        console.log('Storing message port on thread', threadId)
        port = value

        // Post a message back to the main thread to show it is ready to receive messages
        sendMessageToMainThread({ state: 'initialised', info: `Thread ${threadId} initialised`, threadId: threadId })
    } else {
        console.log(`Got message in thread ${threadId}`)
        const action = route.getNode(value.nodeId)
        action
            .sendMessageToChildren(value.message)
            .then(async () => {
                return route.waitForWorkersToFinish()
            })
            .then(() => {
                sendMessageToMainThread({ state: 'finished', info: `Message processed in thread ${threadId}`, threadId: threadId })
            })
            .catch((err: unknown) => console.log('Error processing message', err))

        // TODO error handling
    }
})

export function sendMessageToMainThread(msg: MessageToMainThread): void {
    port.postMessage(msg)
}

export function register(_route: Route): void {
    console.log('Registering route, thread id', threadId)
    route = _route
}