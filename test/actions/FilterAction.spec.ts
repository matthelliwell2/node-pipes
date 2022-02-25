import { FilterAction } from '../../src/actions/FilterAction'

describe('FilterAction', () => {
    it('should filter messages', () => {
        const action = new FilterAction<string, Record<string, string>>(msg => {
            return msg.startsWith('M')
        })

        expect(action.onMessage({ body: 'Matt', metadata: {} })).toEqual({ body: 'Matt', metadata: {} })
        expect(action.onMessage({ body: 'Batt', metadata: {} })).toBeUndefined()
    })
})
