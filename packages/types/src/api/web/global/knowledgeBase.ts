import {
  KnowledgeBase,
  KnowledgeBaseFile,
  KnowledgeBaseType,
  LocalKnowledgeBase,
} from "../../../documents"

export type KnowledgeBaseListResponse = KnowledgeBase[]

export type CreateKnowledgeBaseRequest = Omit<
  KnowledgeBase,
  "_id" | "_rev" | "_deleted" | "type" | "config"
> &
  (
    | ({ type: KnowledgeBaseType.LOCAL } & {
        config: LocalKnowledgeBase["config"]
      })
    | { type: KnowledgeBaseType.GEMINI }
  )

export type UpdateKnowledgeBaseRequest = Omit<
  KnowledgeBase,
  "_deleted" | "type" | "config"
> &
  (
    | ({ type: KnowledgeBaseType.LOCAL } & {
        config: LocalKnowledgeBase["config"]
      })
    | { type: KnowledgeBaseType.GEMINI }
  )

export interface FetchKnowledgeBaseFilesResponse {
  files: KnowledgeBaseFile[]
}

export interface KnowledgeBaseFileUploadResponse {
  file: KnowledgeBaseFile
}
