import type { Message } from '../../src/actions/Action'
import { MergeAction, MergeActionWithTimeout } from '../../src/actions/MergeAction'
import { sleep } from '../util'

describe('MergeAction', () => {
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

    it('throws errors if start not called', () => {
        const action = new MergeAction<string, object>(messages => messages.length > 2)
        try {
            action.onMessage({ body: 'a', metadata: { count: 1 } })
            fail('Exception should be thrown')
        } catch (err) {
            // expected
        }
    })
})

describe('MergeActionWithTimeout', () => {
    let result: Message<string[], object> | undefined = undefined
    let action: MergeActionWithTimeout<string, object>

    beforeEach(async () => {
        action = new MergeActionWithTimeout<string, object>(messages => messages.length > 2, 100)
        await action.start(async msg => {
            result = msg
        })
    })

    it('merges results before timeout until predicate is met', async () => {
        expect(await action.onMessage({ body: 'a', metadata: { count: 1 } })).toBeUndefined()
        expect(await action.onMessage({ body: 'b', metadata: { count: 2 } })).toBeUndefined()
        expect(await action.onMessage({ body: 'c', metadata: { count: 3 } })).toBeUndefined()
        expect(result).toEqual({ body: ['a', 'b', 'c'], metadata: [{ count: 1 }, { count: 2 }, { count: 3 }] })
    })

    it('returns messages after timeout', async () => {
        await action.onMessage({ body: 'a', metadata: { count: 1 } })
        await action.onMessage({ body: 'b', metadata: { count: 2 } })

        await sleep(200)

        expect(result).toEqual({ body: ['a', 'b'], metadata: [{ count: 1 }, { count: 2 }] })
    })

    it('throws errors if start not called', async () => {
        action = new MergeActionWithTimeout<string, object>(messages => messages.length > 2, 100)
        try {
            await action.onMessage({ body: 'a', metadata: { count: 1 } })
            fail('Exception should be thrown')
        } catch (err) {
            // expected
        }
    })

    it('resets the list of messages after they are returned before the timeout', async () => {
        await action.onMessage({ body: 'a', metadata: { count: 1 } })
        await action.onMessage({ body: 'b', metadata: { count: 2 } })
        await action.onMessage({ body: 'c', metadata: { count: 3 } })

        await action.onMessage({ body: 'd', metadata: { count: 4 } })
        await action.onMessage({ body: 'e', metadata: { count: 5 } })
        await action.onMessage({ body: 'f', metadata: { count: 6 } })

        expect(result).toEqual({ body: ['d', 'e', 'f'], metadata: [{ count: 4 }, { count: 5 }, { count: 6 }] })
    })

    it('resets the list of messages after they are returned due to the timeout', async () => {
        await action.onMessage({ body: 'a', metadata: { count: 1 } })
        await action.onMessage({ body: 'b', metadata: { count: 2 } })

        await sleep(200)

        await action.onMessage({ body: 'd', metadata: { count: 4 } })
        await action.onMessage({ body: 'e', metadata: { count: 5 } })

        await sleep(200)

        expect(result).toEqual({ body: ['d', 'e'], metadata: [{ count: 4 }, { count: 5 }] })
    })
})
