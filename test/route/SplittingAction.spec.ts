import { ArraySplittingAction } from '../../src/actions/SplittingAction'

describe('Array Splitting Action', () => {
    it('splits an array', () => {
        const result: unknown[] = []
        const action = new ArraySplittingAction<string, Record<string, number>>()
        action.emit = (message): void => {
            result.push(message)
        }

        action.onMessage({ body: ['foo', 'bar'], metadata: { length: 2 } })
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

    it('throws error if start not called', () => {
        const action = new ArraySplittingAction<string, Record<string, unknown>>()
        expect(() => action.onMessage({ body: ['foo', 'bar'], metadata: {} })).toThrow()
    })
})
