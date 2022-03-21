/* eslint-disable sonarjs/no-duplicate-string */
import MockDate from 'mockdate'
import type { Action } from '../../src/actions/Action'
import type { Message } from '../../src/actions/Action'
import { DirectProducer } from '../../src/producers/DirectProducer'
import { Route } from '../../src/route/Route'
import { sleep } from '../util'
import { routeOutput, simpleMultithreadedRoute, testProducer } from '../workers/TestRoute'
import { ArraySplittingAction } from '../../src/actions/ArraySplittingAction'

jest.setTimeout(9999999)

describe('route', () => {
    beforeAll(() => {
        MockDate.set('2022-01-04')
    })

    afterAll(() => {
        MockDate.reset()
    })

    let messages: Message<number, object>[]
    let route: Route

    beforeEach(() => {
        messages = []
        route = new Route()
    })

    afterEach(async () => {
        return route.stop()
    })

    it('processes multithreaded route', async () => {
        await simpleMultithreadedRoute.start()

        await testProducer.produce(1)
        await testProducer.produce(2)
        await testProducer.produce(3)

        await simpleMultithreadedRoute.waitForWorkersToFinish()
        await simpleMultithreadedRoute.stop()

        expect(routeOutput.length).toEqual(3)
        routeOutput.length = 0
    })

    it('processes splitter in route', async () => {
        const producer = new DirectProducer<number[]>()

        const result: Message<number, object>[] = []
        route.from(producer).toAsync(new ArraySplittingAction<number, object>()).collect(result)
        await route.start()

        await producer.produce([10, 14, 1])
        await producer.produce([11, 15, 2])
        await route.waitForWorkersToFinish()

        // The messages are async so we can't guarantee their order so sort them
        expect(result.map(m => m.body).sort((n1, n2) => n1 - n2)).toEqual([1, 2, 10, 11, 14, 15])
    })

    it('processes simple synchronous route', async () => {
        // given
        route.from(testProducer).log().collect(messages)
        await route.start()

        // when
        await testProducer.produce(1)
        await testProducer.produce(2)
        await testProducer.produce(3)

        // then
        expect(messages.map(m => m.body)).toEqual([1, 2, 3])
    })

    it('processes simple async route', async () => {
        // given
        route
            .from(testProducer)
            .toAsync(async value => {
                await sleep(value.body)
                return value
            })
            .collect(messages)

        await route.start()

        // when
        await testProducer.produce(200)
        await testProducer.produce(10)
        await testProducer.produce(100)

        await route.asyncWorkerFinished.wait()

        // then as they are running in parallel they will come out in a different to than they were put in
        expect(messages.map(m => m.body)).toEqual([10, 100, 200])

        // metadata should be passed through unchanged
        expect(messages.map(m => m.metadata)).toEqual([
            {
                producedDateTime: '2022-01-04T00:00:00.000Z',
                producerMsgId: 'uuid'
            },
            {
                producedDateTime: '2022-01-04T00:00:00.000Z',
                producerMsgId: 'uuid'
            },
            {
                producedDateTime: '2022-01-04T00:00:00.000Z',
                producerMsgId: 'uuid'
            }
        ])
    })

    it('fans message in and out', async () => {
        const collection1: Message<number, object>[] = []
        const collection2: Message<number, object>[] = []

        // This route looks like:
        //            producer
        //               |
        //        ----------------
        //        |              |
        //    filter(even)    filter (odd)
        //        |              |
        //    collection1    collection2
        //        |              |
        //        ----------------
        //               |
        //            collector
        const node = route.from(testProducer)
        node.filter(num => num % 2 === 0)
            .collect(collection1)
            .collect(messages)

        node.asyncFilter(async num => {
            await sleep(10)
            return num % 2 !== 0
        })
            .collect(collection2)
            .log('Async route:')
            .collect(messages)

        await route.start()

        // when
        await testProducer.produce(10)
        await testProducer.produce(11)
        await testProducer.produce(12)
        await testProducer.produce(13)
        await testProducer.produce(7)

        // then collect 1 should get even number, collector 2 odd number and collector should get all the numbers
        await route.asyncWorkerFinished.wait()

        expect(collection1.map(m => m.body)).toEqual([10, 12])
        expect(collection2.map(m => m.body)).toEqual([11, 13, 7])
        expect(messages.map(m => m.body)).toEqual([10, 12, 11, 13, 7])
    })

    it('allows action to ignore metadata without breaking type system', async () => {
        class TranslateAction<MI> implements Action<number, MI, string> {
            onMessage(message: Message<number, MI>): Message<string, MI> | undefined {
                return { body: message.body.toString(), metadata: message.metadata }
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any[] = []
        route.from(testProducer).to(new TranslateAction()).collect(result)
        await route.start()

        // when
        await testProducer.produce(1)
        await testProducer.produce(2)
        await testProducer.produce(3)

        expect(result).toEqual([
            {
                body: '1',
                metadata: {
                    producedDateTime: '2022-01-04T00:00:00.000Z',
                    producerMsgId: 'uuid'
                }
            },
            {
                body: '2',
                metadata: {
                    producedDateTime: '2022-01-04T00:00:00.000Z',
                    producerMsgId: 'uuid'
                }
            },
            {
                body: '3',
                metadata: {
                    producedDateTime: '2022-01-04T00:00:00.000Z',
                    producerMsgId: 'uuid'
                }
            }
        ])
    })
})
