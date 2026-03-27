import * as crypto from "crypto"
import {
  GeminiKnowledgeBase,
  KnowledgeBase,
  KnowledgeBaseFile,
  KnowledgeBaseFileStatus,
  KnowledgeBaseType,
} from "@budibase/types"
import { RagProcessor, RetrievedContextChunk } from "."
import {
  ingestGoogleFile,
  searchGoogleFileStore,
} from "../../knowledgeBase/geminiFileStore"
import { updateKnowledgeBaseFile } from "../../knowledgeBase"

export class GeminiRagProcessor implements RagProcessor {
  private knowledgeBase: GeminiKnowledgeBase

  constructor(knowledgeBase: KnowledgeBase) {
    if (knowledgeBase.type !== KnowledgeBaseType.GEMINI) {
      throw new Error(
        `GeminiRagProcessor is not compatible with knowledge base type ${knowledgeBase.type}`
      )
    }

    this.knowledgeBase = knowledgeBase
  }

  async ingestKnowledgeBaseFile(
    input: KnowledgeBaseFile,
    fileBuffer: Buffer
  ): Promise<void> {
    const ingested = await ingestGoogleFile({
      vectorStoreId: this.knowledgeBase.config.googleFileStoreId,
      filename: input.filename,
      mimetype: input.mimetype,
      buffer: fileBuffer,
    })

    input.status = KnowledgeBaseFileStatus.READY
    input.ragSourceId = ingested.fileId || input.ragSourceId
    input.processedAt = new Date().toISOString()
    input.errorMessage = undefined
    await updateKnowledgeBaseFile(input)
  }

  async search(question: string): Promise<RetrievedContextChunk[]> {
    const rows = await searchGoogleFileStore({
      vectorStoreId: this.knowledgeBase.config.googleFileStoreId,
      query: question,
    })

    const results = rows
      .map<RetrievedContextChunk | undefined>((row, index) => {
        const chunkText = row.content?.[0]?.text?.trim()
        if (!chunkText) {
          return undefined
        }
        return {
          sourceId:
            row.file_id ||
            row.fileId ||
            row.filename ||
            row.attributes?.uri ||
            row.id ||
            `google-result-${index}`,
          chunkText,
          chunkHash: this.hashChunk(chunkText),
        }
      })
      .filter((value): value is RetrievedContextChunk => Boolean(value))

    return results
  }
  private hashChunk = (chunk: string) => {
    return crypto.createHash("sha256").update(chunk).digest("hex")
  }

  async deleteFiles(fileIds: string[]): Promise<void> {
    // TODO
  }
}
