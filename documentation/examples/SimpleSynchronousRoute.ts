import { Route } from '../../src/route/Route'
import { DirectProducer } from '../../src/producers/DirectProducer'

describe('Simple Synchronous Route', function () {
    it('runs a route', async function () {
        const route = new Route()
        const testProducer = new DirectProducer<number>()
        const results: number[] = []

        route
            .from(testProducer)
            .to(value => value * 2)
            .collect(results)
    })
})
