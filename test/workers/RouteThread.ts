/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/naming-convention,@typescript-eslint/no-require-imports */
// TODO is there a nicer way to catch the errors?
try {
    const Thread = require('../../src/workers/RouteThread')
    const { simpleMultithreadedRoute } = require('./TestRoute')
    console.log('Calling register route')
    Thread.register(simpleMultithreadedRoute)
} catch (err) {
    console.log('Error initialising worker thread', err)
}
