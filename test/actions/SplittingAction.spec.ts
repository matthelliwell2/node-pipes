import { ArraySplittingAction } from '../../src/actions/EmittingAction'
import { DirectProducer } from '../../src/producers/DirectProducer'
import Denque from 'denque'
import type { Message } from '../../src/actions/Action'
import type { ProducerMetaData } from '../../src/route/ProducerNode'
import { Route } from '../../src/route/Route'

describe('Array Splitting Action', () => {
    it('splits an array', async () => {
        const result: unknown[] = []
        const action = new ArraySplittingAction<string, Record<string, number>>()
        action.emit = async (message): Promise<void> => {
            result.push(message)
        }

        await action.onMessage({ body: ['foo', 'bar'], metadata: { length: 2 } })
        expect(result).toEqual([
            {
                body: 'foo',
                metadata: { length: 2 }
            },
            {
                body: 'bar',
                metadata: { length: 2 }
            }
        ])
    })

    it('splits an empty array', async () => {
        const result: unknown[] = []
        const action = new ArraySplittingAction<string, Record<string, number>>()
        action.emit = async (message): Promise<void> => {
            result.push(message)
        }

        await action.onMessage({ body: [], metadata: { length: 2 } })
        expect(result).toEqual([])
    })

    it('throws error if start not called', async () => {
        const action = new ArraySplittingAction<string, Record<string, unknown>>()

        try {
            await action.onMessage({ body: ['foo', 'bar'], metadata: {} })
            fail('Expected error to be thrown')
        } catch (err) {
            // expected
        }
    })

    it('splits array in a route', async function () {
        const producer = new DirectProducer<string[]>()
        const messages = new Denque<Message<string, ProducerMetaData>>()
        const route = new Route()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        route.from(producer).toAsync(new ArraySplittingAction<string, any>()).collect(messages)
        await route.start()

        await producer.produce(['a'])

        expect(messages.toArray()).toEqual([{ body: 'bb', metadata: { producedDateTime: '2022-01-04T00:00:00.000Z', producerMsgId: 'uuid' } }])
    })
})
