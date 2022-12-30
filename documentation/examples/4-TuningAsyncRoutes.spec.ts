import { Route } from '../../src/route/Route'
import { DirectProducer } from '../../src/producers/DirectProducer'

interface BookInfo {
    author: string
    title: string
    datePublished: string
}

async function getBookInfo(isbn: string): Promise<BookInfo> {
    // To simulate an http call, we'll return some fixed data after a short delay
    console.log(new Date(), 'ENTER: getBookInfo', isbn)
    await sleep(1)
    console.log(new Date(), 'EXIT: getBookInfo')
    return { author: 'M Helliwell', title: '10 facts about Typescript', datePublished: '2035-06-04' }
}
async function updateBookInfo(bookInfo: BookInfo): Promise<void> {
    // To simulate a database call, we'll just add a delay
    console.log(new Date(), 'ENTER: updateBookInfo', bookInfo)
    await sleep(2000)
    console.log(new Date(), 'EXIT: updateBookInfo')
}

jest.setTimeout(100000)
describe('Tuning Async Routes', function () {
    it('runs a route', async function () {
        const route = new Route()
        const isbnProducer = new DirectProducer<string>()

        route.from(isbnProducer).toAsync(getBookInfo, { handleMetadata: false }).toAsync(updateBookInfo, { handleMetadata: false, bufferSize: 15, concurrency: 10 })

        await route.start()

        for (let i = 0; i < 20; ++i) {
            await isbnProducer.produce(`1-56619-909-${i}`)
        }
        await route.waitForWorkersToFinish()
    })
})

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
