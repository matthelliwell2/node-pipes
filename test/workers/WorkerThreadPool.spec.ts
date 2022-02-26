import { Condition } from '@divine/synchronization'
import { Route } from '../../src/route/Route'
import { WorkerThreadPool } from '../../src/workers/WorkerThreadPool'
import { simpleMultithreadedRoute } from './TestRoute'

jest.setTimeout(9999999)

describe('WorkerThreadPool.spec', () => {
    let workerFinishedCondition: Condition
    let pool: WorkerThreadPool

    // TODO increase coverage
    beforeEach(() => {
        workerFinishedCondition = new Condition()
        pool = new WorkerThreadPool(simpleMultithreadedRoute, { concurrency: 2, bufferSize: 2, filename: './dist/test/workers/RouteThread.js' }, workerFinishedCondition)
        pool.start()
    })

    afterEach(async () => {
        await pool.stop()
    })

    it('throws error is buffer size is less than one', () => {
        expect(() => new WorkerThreadPool(new Route(), { concurrency: 2, bufferSize: 0, filename: '' }, new Condition())).toThrow()
    })

    it('throws errors if concurrency is less than 1', () => {
        expect(() => new WorkerThreadPool(new Route(), { concurrency: 0, bufferSize: 2, filename: '' }, new Condition())).toThrow()
    })

    it('throws error if invalid filename is specified', () => {
        const errorPool = new WorkerThreadPool(new Route(), { concurrency: 2, bufferSize: 2, filename: 'invalid file.js' }, new Condition())
        expect(() => errorPool.start()).toThrow()
    })

    it('throws errors if start is called twice', () => {
        expect(() => pool.start()).toThrow()
    })

    it('notifies when thread has finished processing', async () => {
        await pool.push({ nodeId: 1, message: { body: 1, metadata: {} } })

        const start = new Date().getTime()
        await workerFinishedCondition.wait()
        const end = new Date().getTime()
        expect(end - start).toBeGreaterThan(200)
    })

    it('is busy when thread is processing message', async () => {
        await pool.push({ nodeId: 1, message: { body: 1, metadata: {} } })
        expect(pool.isBusy).toBeTruthy()
    })

    it('is busy when message is buffered', async () => {
        await pool.push({ nodeId: 1, message: { body: 1, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 2, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 3, metadata: {} } })
        expect(pool.isBusy).toBeTruthy()
    })

    it('blocks when buffer is full', async () => {
        await pool.push({ nodeId: 1, message: { body: 1, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 2, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 3, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 4, metadata: {} } })

        // The 5th message will block until one of the other messages has finished which takes about 200ms due to sleep in it
        const start = new Date().getTime()
        await pool.push({ nodeId: 1, message: { body: 5, metadata: {} } })
        const end = new Date().getTime()
        console.log('Elapsed', end - start)

        expect(end - start).toBeGreaterThan(150)
    })

    it('proceses buffered messages when thread is freed', async () => {
        const start = new Date().getTime()
        // Two messages will be processed in the 2 threads
        await pool.push({ nodeId: 1, message: { body: 1, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 2, metadata: {} } })
        // Two messages will be buffered until the first two complete after about 200ms
        await pool.push({ nodeId: 1, message: { body: 3, metadata: {} } })
        await pool.push({ nodeId: 1, message: { body: 4, metadata: {} } })
        // So when the 2nd two complete it should be about 400ms
        await workerFinishedCondition.wait()
        const end = new Date().getTime()

        expect(end - start).toBeGreaterThan(400)

        console.log('Elapsed time', end - start)
    })

    it('ignores calls to stop when not started', async () => {
        await pool.stop()
        pool = new WorkerThreadPool(new Route(), { concurrency: 2, bufferSize: 2, filename: './dist/test/workers/RouteThread.js' }, workerFinishedCondition)
        await pool.stop()
    })
})
