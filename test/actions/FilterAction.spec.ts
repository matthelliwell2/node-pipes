/* eslint-disable sonarjs/no-duplicate-string */
import { AsyncFilterAction, FilterAction } from '../../src/actions/FilterAction'
import { DirectProducer } from '../../src/producers/DirectProducer'
import Denque from 'denque'
import type { Message } from '../../src/actions/Action'
import type { ProducerMetaData } from '../../src/route/ProducerNode'
import { Route } from '../../src/route/Route'
import MockDate from 'mockdate'
import { sleep } from '../util'

describe('FilterAction', () => {
    beforeAll(() => {
        MockDate.set('2022-01-04')
    })

    afterAll(() => {
        MockDate.reset()
    })

    it('filters messages', () => {
        const action = new FilterAction<string, Record<string, string>>(msg => {
            return msg.startsWith('M')
        })

        expect(action.onMessage({ body: 'Matt', metadata: {} })).toEqual({ body: 'Matt', metadata: {} })
        expect(action.onMessage({ body: 'Batt', metadata: {} })).toBeUndefined()
    })

    it('async filters messages', async () => {
        const action = new AsyncFilterAction<string, Record<string, string>>(async msg => {
            await sleep(1)
            return msg.startsWith('M')
        })

        expect(await action.onMessage({ body: 'Matt', metadata: {} })).toEqual({ body: 'Matt', metadata: {} })
        expect(await action.onMessage({ body: 'Batt', metadata: {} })).toBeUndefined()
    })

    it('filters messages with a function in a route', async function () {
        const producer = new DirectProducer<string>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        route
            .from(producer)
            .filter(m => m.length > 1)
            .collect(messages)
        await route.start()

        await producer.produce('a')
        await producer.produce('bb')
        await producer.produce('c')

        expect(messages.toArray()).toEqual([{ body: 'bb', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }])
    })

    it('filters messages with an async function in a route', async function () {
        const producer = new DirectProducer<string>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        route
            .from(producer)
            .asyncFilter(async m => {
                await sleep(1)
                return m.length > 1
            })
            .collect(messages)
        await route.start()

        await producer.produce('a')
        await producer.produce('bb')
        await producer.produce('c')

        await route.waitForWorkersToFinish()

        expect(messages.toArray()).toEqual([{ body: 'bb', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }])
    })

    it('filters messages with an action in a route', async function () {
        const producer = new DirectProducer<string>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        route
            .from(producer)
            .to(new FilterAction(m => m.length > 1))
            .collect(messages)
        await route.start()

        await producer.produce('a')
        await producer.produce('bb')
        await producer.produce('c')

        expect(messages.toArray()).toEqual([{ body: 'bb', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }])
    })

    it('filters messages with an async action in a route', async function () {
        const producer = new DirectProducer<string>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        route
            .from(producer)
            .toAsync(
                new AsyncFilterAction(async m => {
                    await sleep(1)
                    return m.length > 1
                })
            )
            .collect(messages)
        await route.start()

        await producer.produce('a')
        await producer.produce('bb')
        await producer.produce('c')

        await route.waitForWorkersToFinish()

        expect(messages.toArray()).toEqual([{ body: 'bb', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }])
    })
})
