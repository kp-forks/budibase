import { Document } from "../.."

export enum KnowledgeBaseType {
  LOCAL = "local",
  GEMINI = "gemini",
}

export interface LocalKnowledgeBase extends Document {
  name: string
  type: KnowledgeBaseType.LOCAL
  config: {
    embeddingModel: string
    vectorDb: string
  }
}

export interface GeminiKnowledgeBase extends Document {
  name: string
  type: KnowledgeBaseType.GEMINI
  config: {
    googleFileStoreId: string
  }
}

export type KnowledgeBase = LocalKnowledgeBase | GeminiKnowledgeBase

export enum KnowledgeBaseFileStatus {
  PROCESSING = "processing",
  READY = "ready",
  FAILED = "failed",
}

export interface KnowledgeBaseFile extends Document {
  knowledgeBaseId: string
  filename: string
  mimetype?: string
  size?: number
  objectStoreKey: string
  ragSourceId: string
  status: KnowledgeBaseFileStatus
  uploadedBy: string
  errorMessage?: string
  processedAt?: string
}
