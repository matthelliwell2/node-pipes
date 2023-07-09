import { chomp, chunksToLinesAsync } from '@rauschma/stringio'
import * as fs from 'fs'
import type { AsyncEmitter, Emitter } from '../actions/Action'

export interface FileProducerMetadata {
    filePath: string
    lineNumber: number
    eof: boolean
}

// TODO add flag to control if eof message emitted
/**
 * Produced a message for each line in a file. Once the last line is read a message with a negative line number will be
 * send to indicate there are no more messages.
 */
export class FileLineProducer implements Emitter<string> {
    private running = true
    constructor(public readonly filePath: string) {}

    async flush(): Promise<boolean> {
        return false
    }

    /**
     * Starts the streaming from the file.
     * @return Promise that resolves once all the file has been processed.
     */
    async start(emit: AsyncEmitter<string>): Promise<void> {
        return this.streamFile(emit)
    }

    async stop(): Promise<void> {
        this.running = false
    }

    private async streamFile(emit: AsyncEmitter<string>): Promise<void> {
        const stream = fs.createReadStream(this.filePath)
        let lineNum = 0
        for await (const line of chunksToLinesAsync(stream)) {
            const msg = chomp(line)
            await emit({ body: msg, metadata: { lineNumber: lineNum++, filePath: this.filePath, eof: false } })
            // TODO Error handling - DLQ?
            if (!this.running) {
                return
            }
        }

        await emit({ body: 'EOF', metadata: { lineNumber: -1, filePath: this.filePath, eof: true } })
    }
}
