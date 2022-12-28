import { Route } from '../../src/route/Route'
import { DirectProducer } from '../../src/producers/DirectProducer'
import type { Message } from '../../src/actions/Action'

describe('Simple Synchronous Route', function () {
    it('runs a route', async function () {
        const route = new Route()
        const testProducer = new DirectProducer<number>()
        const results: Message<number>[] = []

        route
            .from(testProducer)
            .to(value => value * 2, false) // Just double each value passed in
            .collect(results)

        await route.start()

        await testProducer.produce(7)
        await testProducer.produce(3)

        expect(results.map(r => r.body)).toEqual([14, 6])
    })
})
