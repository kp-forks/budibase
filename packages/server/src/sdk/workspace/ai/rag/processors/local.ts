import {
  KnowledgeBase,
  KnowledgeBaseType,
  LocalKnowledgeBase,
} from "@budibase/types"
import { RagProcessor, RetrievedContextChunk } from "."
import { NotImplementedError } from "@budibase/backend-core"

export class LocalRagProcessor implements RagProcessor {
  private knowledgeBase: LocalKnowledgeBase

  constructor(knowledgeBase: KnowledgeBase) {
    if (knowledgeBase.type !== KnowledgeBaseType.LOCAL) {
      throw new Error(
        `GeminiRagProcessor is not compatible with knowledge base type ${knowledgeBase.type}`
      )
    }

    this.knowledgeBase = knowledgeBase
  }

  ingestKnowledgeBaseFile(): Promise<void> {
    throw new NotImplementedError("Local file ingestion is not implemented")
  }

  search(): Promise<RetrievedContextChunk[]> {
    throw new NotImplementedError("Local file ingestion is not implemented")
  }

  deleteFiles(): Promise<void> {
    throw new NotImplementedError("Local file ingestion is not implemented")
  }
}
