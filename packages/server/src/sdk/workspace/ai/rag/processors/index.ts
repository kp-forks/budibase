import { KnowledgeBaseFile } from "@budibase/types"

export interface RetrievedContextChunk {
  sourceId?: string
  chunkText: string
}

export interface RagProcessor {
  ingestKnowledgeBaseFile(
    input: KnowledgeBaseFile,
    fileBuffer: Buffer
  ): Promise<void>

  search(question: string): Promise<RetrievedContextChunk[]>
  deleteFiles(fileIds: string[]): Promise<void>
}
