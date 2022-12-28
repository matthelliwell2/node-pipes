import { MessagePort, parentPort, threadId } from 'worker_threads'
import type { Message } from '../actions/Action'
import type { Route } from '../route/Route'
import type { MessageToWorker } from './WorkerThreadPool'

/**
 * This is the code that is run as a worker thread. Uses create their own file which includes this one and calls the
 * register function.
 */

let port: MessagePort
let route: Route

/**
 * A message sent from a worker thread with the results of an action
 */
export interface ActionResultThreadMessage {
    threadId: number

    /**
     * The state of the worker thread
     *  - processing: the thread is returning the result of an action to the main thread but might still be running
     * other actions
     */
    state: 'processing'

    /**
     * The id of the node that produced the message so the threads needs to pass the message to all children of this
     * node
     */
    nodeId: number
    // TODO can this be made more typesafe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Message<any>
}

/**
 * A message sent from a worker thread when the thread state changes.
 */
interface StateChangeThreadMessage {
    threadId: number

    /**
     * The state of the worker thread
     *  - intialised: the thread is initialised and ready to process messages
     *  - finished: the thread has completed processing the last message it was sent and it ready to process another
     */
    state: 'initialised' | 'finished'
    info: string
}

export type MessageToMainThread = StateChangeThreadMessage | ActionResultThreadMessage

parentPort?.on('message', processMessage)

// TODO how to get good test coverage for this?
function processMessage(value: MessageToWorker | MessagePort): void {
    if (value instanceof MessagePort) {
        console.log('Storing message port on thread', threadId)
        port = value

        // Post a message back to the main thread to show it is ready to receive messages
        sendMessageToMainThread({ state: 'initialised', info: `Thread ${threadId} initialised`, threadId: threadId })
    } else {
        console.log(new Date().toISOString(), `Got message in thread ${threadId}`)
        const action = route.getNode(value.nodeId)
        action
            .sendMessageToChildren(value.message)
            .then(async () => {
                return route.waitForWorkersToFinish()
            })
            .then(() => {
                sendMessageToMainThread({
                    state: 'finished',
                    info: `Message processed in thread ${threadId}`,
                    threadId: threadId
                })
            })
            .catch((err: unknown) => console.log('Error processing message', err))

        // TODO error handling
    }
}

export function sendMessageToMainThread(msg: MessageToMainThread): void {
    port.postMessage(msg)
}

export function register(_route: Route): void {
    console.log('Registering route, thread id', threadId)
    route = _route
}
