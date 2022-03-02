/* eslint-disable sonarjs/no-duplicate-string */
import type { Message } from '../../src/actions/Action'
import { FileLineProducer, FileProducerMetadata } from '../../src/producers/FileLineProducer'
import { sleep } from '../util'

describe('FileProducer.spec', () => {
    it('reads lines from file', async () => {
        const producer = new FileLineProducer('test/producers/sample.txt')

        const lines: Message<string, FileProducerMetadata>[] = []
        await producer.start(async msg => {
            lines.push(msg)
        })

        expect(lines).toEqual([
            {
                body: 'line 1',
                metadata: {
                    eof: false,
                    filePath: 'test/producers/sample.txt',
                    lineNumber: 0
                }
            },
            {
                body: 'line 2',
                metadata: {
                    eof: false,
                    filePath: 'test/producers/sample.txt',
                    lineNumber: 1
                }
            },
            {
                body: '',
                metadata: {
                    eof: false,
                    filePath: 'test/producers/sample.txt',
                    lineNumber: 2
                }
            },
            {
                body: 'line 4',
                metadata: {
                    eof: false,
                    filePath: 'test/producers/sample.txt',
                    lineNumber: 3
                }
            },
            {
                body: 'EOF',
                metadata: {
                    eof: true,
                    filePath: 'test/producers/sample.txt',
                    lineNumber: -1
                }
            }
        ])
    })

    it('stops processing lines when stop is called', async () => {
        const producer = new FileLineProducer('test/producers/sample.txt')

        let count = 0
        const p = producer.start(async () => {
            ++count
            await sleep(10)
        })

        await producer.stop()

        await p

        expect(count).toBeLessThan(5)
    })
})
