import type { AsyncEmitter, Emitter, Message } from '../actions/Action'
import { BaseNode } from './BaseNode'
import type { Route } from './Route'
import { v4 as uuid } from 'uuid'

export interface ProducerMetaData {
    producerMsgId: string
    producedDateTime: string
}

/**
 * A node that contains a producer. When a message is emitted, it will add ProducerMetaData to the metadata and pass the message to the child nodes.
 */
export class ProducerNode<O, M extends object> extends BaseNode<O, M & ProducerMetaData> {
    constructor(route: Route, private readonly producer: Emitter<O, M>) {
        super(route)
    }

    override async start(): Promise<void> {
        await this.producer.start(this.onMessageEmitted)
        await super.start()
    }

    override async stop(): Promise<void> {
        await this.producer.stop()
        await super.stop()
    }

    /**
     * Called when a new message is available. It just sends the messages to each link
     */
    private readonly onMessageEmitted: AsyncEmitter<O, M> = async (output: Message<O, M>): Promise<void> => {
        const updatedMetaData: M & ProducerMetaData = { ...output.metadata, producerMsgId: uuid(), producedDateTime: new Date().toISOString() }

        await this.sendMessageToChildren({ body: output.body, metadata: updatedMetaData })
    }
}
