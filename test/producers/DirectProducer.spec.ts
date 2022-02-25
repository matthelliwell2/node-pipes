import { DirectProducer } from '../../src/producers/DirectProducer'

describe('DirectProducer', () => {
    it('produces messages', async () => {
        const producer = new DirectProducer<string>()

        const messages: string[] = []
        await producer.start(async msg => {
            messages.push(msg.body)
        })

        await producer.produce('foo')
        await producer.produce('bar')

        expect(messages).toEqual(['foo', 'bar'])
    })

    it('throws error if start not called', async () => {
        const producer = new DirectProducer<string>()

        try {
            await producer.produce('foo')
            fail('Expected error to be thrown')
        } catch (err) {
            // expected
        }
    })
})
