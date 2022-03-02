import { MergeAction } from '../../src/actions/MergeAction'

describe('MergeAction.spec', () => {
    it('merges results until predicate is met', () => {
        const action = new MergeAction<string, object>(messages => messages.length > 2)

        expect(action.onMessage({ body: 'a', metadata: { count: 1 } })).toBeUndefined()
        expect(action.onMessage({ body: 'b', metadata: { count: 2 } })).toBeUndefined()
        expect(action.onMessage({ body: 'c', metadata: { count: 3 } })).toEqual({ body: ['a', 'b', 'c'], metadata: [{ count: 1 }, { count: 2 }, { count: 3 }] })
    })

    it('resets the list of messages after they are returned', () => {
        const action = new MergeAction<string, object>(messages => messages.length > 2)

        action.onMessage({ body: 'a', metadata: { count: 1 } })
        action.onMessage({ body: 'b', metadata: { count: 2 } })
        action.onMessage({ body: 'c', metadata: { count: 3 } })

        expect(action.onMessage({ body: 'd', metadata: { count: 4 } })).toBeUndefined()
        expect(action.onMessage({ body: 'e', metadata: { count: 5 } })).toBeUndefined()
        expect(action.onMessage({ body: 'f', metadata: { count: 6 } })).toEqual({ body: ['d', 'e', 'f'], metadata: [{ count: 4 }, { count: 5 }, { count: 6 }] })
    })

    it('returns messages after timeout', () => {})

    it('does not use a timeout if none is specified', () => {})
})
