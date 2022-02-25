import { Condition } from '@divine/synchronization'
import { AsyncWorkerPool } from '../../src/workers/AsyncWorkerPool'
import { sleep } from '../util'

describe('AsyncWorkPool', () => {
    let pool: AsyncWorkerPool<string, string, Record<string, unknown>>

    beforeEach(() => {
        pool = new AsyncWorkerPool<string, string, Record<string, unknown>>(
            async msg => {
                // Block the worker so we can test how many can run at once
                await sleep(100)
                return msg
            },
            2,
            1,
            new Condition()
        )
    })
    it('should process message in parallel up to the concurrency limit', async () => {
        await pool.push({ body: '1', metadata: {} })
        await pool.push({ body: '2', metadata: {} })
        await pool.push({ body: '3', metadata: {} })
        expect(pool.runningCount).toEqual(2)
        expect(pool.bufferSize).toEqual(1)

        await sleep(400)
        expect(pool.runningCount).toEqual(0)
        expect(pool.bufferSize).toEqual(0)
    })

    it('should block when the queue is full', async () => {
        // given
        await pool.push({ body: '1', metadata: {} })
        await pool.push({ body: '2', metadata: {} })
        await pool.push({ body: '3', metadata: {} })

        //when
        const start = new Date().getTime()
        // This should block until the others are finished, so about 100 ms as that how it will be for first two messages to complete making space for the next two messages
        await pool.push({ body: '4', metadata: {} })
        const end = new Date().getTime()

        expect(end - start).toBeGreaterThanOrEqual(90)
    })

    it('should throw an exception if the queue size is less than one', async () => {
        expect(
            () =>
                new AsyncWorkerPool<string, string, Record<string, unknown>>(
                    async msg => {
                        console.log(msg)
                        return msg
                    },
                    2,
                    0,
                    new Condition()
                )
        ).toThrow()
    })

    it('should throw an exception if the concurrently is less than one', () => {
        expect(
            () =>
                new AsyncWorkerPool<string, string, Record<string, unknown>>(
                    async msg => {
                        console.log(msg)
                        return msg
                    },
                    0,
                    1,
                    new Condition()
                )
        ).toThrow()
    })
})
