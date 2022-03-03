import { ArraySplittingAction } from '../../src/actions/EmittingAction'

describe('Array Splitting Action', () => {
    it('splits an array', async () => {
        const result: unknown[] = []
        const action = new ArraySplittingAction<string, Record<string, number>>()
        action.emit = async (message): Promise<void> => {
            result.push(message)
        }

        await action.onMessage({ body: ['foo', 'bar'], metadata: { length: 2 } })
        expect(result).toEqual([
            {
                body: 'foo',
                metadata: { length: 2 }
            },
            {
                body: 'bar',
                metadata: { length: 2 }
            }
        ])
    })

    it('throws error if start not called', async () => {
        const action = new ArraySplittingAction<string, Record<string, unknown>>()

        try {
            await action.onMessage({ body: ['foo', 'bar'], metadata: {} })
            fail('Expected error to be thrown')
        } catch (err) {
            // expected
        }
    })
})
