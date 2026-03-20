import {
  KnowledgeBase,
  KnowledgeBaseFile,
  KnowledgeBaseType,
} from "../../../documents"

export type KnowledgeBaseListResponse = KnowledgeBase[]
export type CreateKnowledgeBaseRequest = Omit<
  KnowledgeBase,
  "_id" | "_rev" | "_deleted" | "type"
> & {
  type?: KnowledgeBaseType
}
export type UpdateKnowledgeBaseRequest = Omit<KnowledgeBase, "type"> & {
  type?: KnowledgeBaseType
}

export interface FetchKnowledgeBaseFilesResponse {
  files: KnowledgeBaseFile[]
}

export interface KnowledgeBaseFileUploadResponse {
  file: KnowledgeBaseFile
}
