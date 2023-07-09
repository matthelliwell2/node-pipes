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
    await sleep(100)
    console.log(new Date(), 'EXIT: getBookInfo')
    return { author: 'M Helliwell', title: '10 facts about Typescript', datePublished: '2035-06-04' }
}
async function updateBookInfo(bookInfo: BookInfo): Promise<void> {
    // To simular a database call, we'll just add a delay
    console.log(new Date(), 'ENTER: updateBookInfo', bookInfo)
    await sleep(300)
    console.log(new Date(), 'EXIT: updateBookInfo')
}

describe('Simple Async Route', function () {
    it('runs a route', async function () {
        const route = new Route()
        const isbnProducer = new DirectProducer<string>()

        route.from(isbnProducer).toAsync(getBookInfo, { handleMetadata: false }).toAsync(updateBookInfo, { handleMetadata: false })

        await route.start()

        await isbnProducer.produce('1-56619-909-3')
        await route.waitForWorkersToFinish()
    })
})

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
