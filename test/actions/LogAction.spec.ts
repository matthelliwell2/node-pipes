import { LogAction } from '../../src/actions/LogAction'

describe('LogAction.spec', () => {
    it('should log messages', () => {
        const consoleSpy = jest.spyOn(console, 'log')

        const action = new LogAction<string, Record<string, string>>()
        action.onMessage({ body: 'foo', metadata: {} })
        action.onMessage({ body: 'bar', metadata: { foobar: 'foobar' } })

        expect(consoleSpy.mock.calls).toEqual([[{ body: 'foo', metadata: {} }], [{ body: 'bar', metadata: { foobar: 'foobar' } }]])
    })

    it('should pass through messages', () => {
        const action = new LogAction<string, Record<string, string>>()
        const result = action.onMessage({ body: 'bar', metadata: { foobar: 'foobar' } })

        expect(result).toEqual({ body: 'bar', metadata: { foobar: 'foobar' } })
    })
})
