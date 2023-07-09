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
async function updateBookInfo(bookInfo: BookInfo): Promise<BookInfo> {
    // To simular a database call, we'll just add a delay
    console.log(new Date(), 'ENTER: updateBookInfo', bookInfo)
    await sleep(2000)
    console.log(new Date(), 'EXIT: updateBookInfo')

    // If you aren't changing the message, it is good practice to always return the same message that was passed in. This
    // makes it easier to add other actions after this one.
    return bookInfo
}

jest.setTimeout(100000)
describe('Handling metadata', function () {
    it('times a route', async function () {
        const route = new Route()
        const isbnProducer = new DirectProducer<string>()

        route
            .from(isbnProducer)
            .toAsync(getBookInfo, { handleMetadata: false })
            .toAsync(updateBookInfo, { handleMetadata: false, bufferSize: 15, concurrency: 10 })
            .to(
                message => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                    const producedAt = new Date(message.metadata.producedDateTime).getTime()
                    console.log('Elapsed time:', new Date().getTime() - producedAt, 'ms')
                    return message
                },
                { handleMetadata: true }
            )

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
