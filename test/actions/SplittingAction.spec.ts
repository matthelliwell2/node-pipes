import MockDate, * as Mockdate from 'mockdate'
import { DirectProducer } from '../../src/producers/DirectProducer'
import Denque from 'denque'
import type { Message } from '../../src/actions/Action'
import { Route } from '../../src/route/Route'
import { ArraySplittingAction } from '../../src/actions/ArraySplittingAction'

describe('Array Splitting Action', () => {
    it('splits an array', async () => {
        const action = new ArraySplittingAction<string>()

        const result = action.onMessage({ body: ['foo', 'bar'], metadata: { length: 2 } })
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
        const action = new ArraySplittingAction<string>()

        const result = action.onMessage({ body: [], metadata: { length: 2 } })
        expect(result).toEqual([])
    })

    it('splits array in a route', async function () {
        MockDate.set('2022-03-02T12:33:14Z')
        const producer = new DirectProducer<string[]>()
        const messages = new Denque<Message<string>>()
        const route = new Route()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        route.from(producer).to(new ArraySplittingAction<string>()).collect(messages)
        await route.start()

        await producer.produce(['a', 'b'])

        await route.waitForWorkersToFinish()

        expect(messages.toArray()).toEqual([
            { body: 'a', metadata: { producedDateTime: '2022-03-02T12:33:14.000Z', producerMsgId: 'uuid' } },
            { body: 'b', metadata: { producedDateTime: '2022-03-02T12:33:14.000Z', producerMsgId: 'uuid' } }
        ])
        Mockdate.reset()
    })
})
