import { Document } from "../.."

export enum KnowledgeBaseType {
  LOCAL = "local",
  GOOGLE = "google",
}

export interface KnowledgeBase extends Document {
  name: string
  type: KnowledgeBaseType
  embeddingModel?: string
  vectorDb?: string
}

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
  chunkCount: number
  uploadedBy: string
  errorMessage?: string
  processedAt?: string
}
