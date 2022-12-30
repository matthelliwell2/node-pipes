import { Route } from '../../src/route/Route'
import { DirectProducer } from '../../src/producers/DirectProducer'
import type { Action, AsyncAction, Message } from '../../src/actions/Action'

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

class UpdateBookInfoAction implements AsyncAction<BookInfo, BookInfo> {
    async onMessage(bookInfo: Message<BookInfo>): Promise<Message<BookInfo>> {
        // To simulate a database call, we'll just add a delay
        console.log(new Date(), 'ENTER: updateBookInfo', bookInfo)
        await sleep(2000)
        console.log(new Date(), 'EXIT: updateBookInfo')
        return bookInfo
    }

    async start(): Promise<void> {
        console.log('Connect to the database here and store connection in a field')
    }
}

class FilterEveryOtherMessageAction<I> implements Action<I, I> {
    private count = 0
    onMessage(message: Message<I>): Message<I> | undefined {
        ++this.count
        if (this.count % 2 === 0) {
            return message
        } else {
            return undefined
        }
    }
}

jest.setTimeout(100000)
describe('Customising Actions', function () {
    it('runs a route', async function () {
        const route = new Route()
        const isbnProducer = new DirectProducer<string>()

        const results: Message<BookInfo>[] = []
        route
            .from(isbnProducer)
            .to(new FilterEveryOtherMessageAction())
            .toAsync(getBookInfo, { handleMetadata: false })
            .toAsync(new UpdateBookInfoAction(), { bufferSize: 15, concurrency: 10 })
            .collect(results)

        await route.start()

        for (let i = 0; i < 20; ++i) {
            await isbnProducer.produce(`1-56619-909-${i}`)
        }
        await route.waitForWorkersToFinish()

        expect(results.length).toEqual(10)

        await route.stop()
    })
})

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
