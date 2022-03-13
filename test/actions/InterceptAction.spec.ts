/* eslint-disable sonarjs/no-duplicate-string */
import Denque from 'denque'
import MockDate from 'mockdate'
import type { Message } from '../../src/actions/Action'
import { InterceptAction } from '../../src/actions/InterceptAction'
import { DirectProducer } from '../../src/producers/DirectProducer'
import type { ProducerMetaData } from '../../src/route/ProducerNode'
import { Route } from '../../src/route/Route'

describe('InterceptAction', () => {
    beforeAll(() => {
        MockDate.set('2022-01-04')
    })

    afterAll(() => {
        MockDate.reset()
    })

    it('intercepts messages and metadata array', () => {
        const messages: Message<string, Record<string, string>>[] = []
        const action = new InterceptAction<string, Record<string, string>>(messages)
        action.onMessage({ body: 'foo', metadata: { foo: 'meta1' } })
        action.onMessage({ body: 'bar', metadata: { bar: 'meta2' } })

        expect(messages).toEqual([
            { body: 'foo', metadata: { foo: 'meta1' } },
            { body: 'bar', metadata: { bar: 'meta2' } }
        ])
    })

    it('intercepts messages and metadata to queue', () => {
        const messages = new Denque<Message<string, Record<string, string>>>()
        const action = new InterceptAction<string, Record<string, string>>(messages)
        action.onMessage({ body: 'foo', metadata: { foo: 'meta1' } })
        action.onMessage({ body: 'bar', metadata: { bar: 'meta2' } })

        expect(messages.toArray()).toEqual([
            { body: 'foo', metadata: { foo: 'meta1' } },
            { body: 'bar', metadata: { bar: 'meta2' } }
        ])
    })

    it('passes through messages', () => {
        const messages = new Denque<Message<string, Record<string, string>>>()
        const action = new InterceptAction<string, Record<string, string>>(messages)
        const result = action.onMessage({ body: 'foo', metadata: { foo: 'meta1' } })

        expect(result).toEqual({ body: 'foo', metadata: { collectionDateTime: '2022-01-04T00:00:00.000Z', foo: 'meta1' } })
    })

    it('intercepts messages in a route', async () => {
        const producer = new DirectProducer<string>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        route.from(producer).collect(messages)
        await route.start()

        await producer.produce('a')
        await producer.produce('b')
        await producer.produce('c')

        expect(messages.toArray()).toEqual([
            { body: 'a', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } },
            { body: 'b', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } },
            { body: 'c', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }
        ])
    })
})
