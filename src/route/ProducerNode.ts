import type { Message } from '../actions/Action'
import type { AsyncEmitter, Producer } from '../producers/Producer'
import { BaseNode } from './BaseNode'
import type { Route } from './Route'
import { v4 as uuid } from 'uuid'

export interface ProducerMetaData {
    producerMsgId: string
    producedDateTime: string
}

export class ProducerNode<O, M extends object> extends BaseNode<O, M & ProducerMetaData> {
    constructor(route: Route, private readonly producer: Producer<O, M>) {
        super(route)
    }

    start(): void {
        void this.producer.start(this.onMessageEmitted)
    }

    override stop(): void {
        this.producer.stop()
        super.stop()
    }

    /**
     * Called when a new message is available. As the producer has no actions it just needs to send the messages to each link
     */
    private readonly onMessageEmitted: AsyncEmitter<O, M> = async (output: Message<O, M>): Promise<void> => {
        const updatedMetaData: M & ProducerMetaData = { ...output.metadata, producerMsgId: uuid(), producedDateTime: new Date().toISOString() }

        await this.sendMessageToChildren({ body: output.body, metadata: updatedMetaData })
    }
}
