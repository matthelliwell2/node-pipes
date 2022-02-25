import { DirectProducer } from '../../src/producers/DirectProducer'
import { Route } from '../../src/route/Route'
import { sleep } from '../util'

export const testProducer = new DirectProducer<number>()
export const routeOutput = []
export const simpleMultithreadedRoute = new Route({ filename: './dist/test/workers/RouteThread.js', concurrency: 2, bufferSize: 2 })
simpleMultithreadedRoute
    .from(testProducer)
    .worker()
    .toAsync(async msg => {
        await sleep(200)
        return { body: msg.body + 1, metadata: msg.metadata }
    })
    .main()
    .collect(routeOutput)
