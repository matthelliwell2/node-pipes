import { Route } from '../../src/route/Route'
import { DirectProducer } from '../../src/producers/DirectProducer'
import * as fs from 'fs'
import type { Message } from '../../src/actions/Action'
import { MergeAction } from '../../src/actions/MergeAction'
import { sleep } from '../../test/util'

function readFile(filename: Message<string>): Message<string>[] {
    return fs
        .readFileSync(filename.body)
        .toString()
        .split(/\n\r|\n/)
        .map(line => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return { body: line, metadata: filename.metadata } // Just return the same metadata as was passed in
        })
}

function toLength(value: string): number {
    return value.length
}
jest.setTimeout(10000)
describe('Merging and Splitting', function () {
    it('splits messages', async function () {
        const filenameProducer = new DirectProducer<string>()

        const route = new Route()
        route.from(filenameProducer).to(readFile, { handleMetadata: true }).to(toLength, { handleMetadata: false }).log()

        await route.start()

        await filenameProducer.produce('documentation/examples/7-MergingAndSplitting.md')

        await route.waitForWorkersToFinish()
        await route.stop()
    })

    it('merges messages', async function () {
        interface DBItem {
            key: string
            value: string
        }

        const results: Message<DBItem[]>[] = []
        const itemProducer = new DirectProducer<DBItem>()
        const route = new Route()
        route
            .from(itemProducer)
            .toAsync(
                new MergeAction(q => {
                    return q.length >= 25
                }, 5000)
            )
            .to(
                body => {
                    console.log('Received', body.length, 'messages')
                    return body
                },
                { handleMetadata: false }
            )
            .collect(results)

        await route.start()

        for (let i = 0; i < 30; ++i) {
            await itemProducer.produce({ key: `key${i}`, value: `value${i}` })
        }

        await route.waitForWorkersToFinish()
        await route.stop()

        expect(results.length).toEqual(2)
        expect(results[0].body.length).toEqual(25)
        expect(results[1].body.length).toEqual(5)

        await sleep(2000)
    })
})
