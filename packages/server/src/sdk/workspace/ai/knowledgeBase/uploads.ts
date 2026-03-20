import { context, docIds, objectStore } from "@budibase/backend-core"
import {
  KnowledgeBaseFile,
  KnowledgeBaseFileStatus,
  KnowledgeBaseType,
} from "@budibase/types"
import { ObjectStoreBuckets } from "../../../../constants"
import { enqueueRagFileIngestion } from "../rag/queue"
import { createKnowledgeBaseFile, updateKnowledgeBaseFile } from "./files"
import { find as findKnowledgeBase } from "./crud"
import { ingestGoogleFile } from "./googleFileStore"

interface UploadKnowledgeBaseFileInput {
  knowledgeBaseId: string
  filename: string
  mimetype?: string
  size?: number
  buffer: Buffer
  uploadedBy: string
}

const buildKnowledgeBaseFileObjectStoreKey = (
  workspaceId: string,
  knowledgeBaseId: string,
  fileId: string,
  filename: string
) =>
  `${workspaceId}/ai/knowledge-bases/${knowledgeBaseId}/files/${fileId}/${filename}`

export const uploadKnowledgeBaseFile = async (
  input: UploadKnowledgeBaseFileInput
): Promise<KnowledgeBaseFile> => {
  const workspaceId = context.getOrThrowWorkspaceId()
  const knowledgeBase = await findKnowledgeBase(input.knowledgeBaseId)
  if (!knowledgeBase) {
    throw new Error("Knowledge base not found")
  }

  const fileId = docIds.generateKnowledgeBaseFileID(input.knowledgeBaseId)
  const objectStoreKey = buildKnowledgeBaseFileObjectStoreKey(
    workspaceId,
    input.knowledgeBaseId,
    fileId,
    input.filename
  )

  try {
    await objectStore.upload({
      bucket: ObjectStoreBuckets.APPS,
      filename: objectStoreKey,
      body: input.buffer,
      type: input.mimetype,
    })

    const knowledgeBaseFile = await createKnowledgeBaseFile({
      id: fileId,
      knowledgeBaseId: input.knowledgeBaseId,
      filename: input.filename,
      mimetype: input.mimetype,
      objectStoreKey,
      size: input.size ?? input.buffer.byteLength,
      uploadedBy: input.uploadedBy,
    })

    try {
      if (
        (knowledgeBase.type || KnowledgeBaseType.LOCAL) ===
        KnowledgeBaseType.GOOGLE
      ) {
        if (!knowledgeBase.googleFileStoreId) {
          throw new Error(
            "Google file store is not configured for this knowledge base"
          )
        }
        const ingested = await ingestGoogleFile({
          vectorStoreId: knowledgeBase.googleFileStoreId,
          filename: input.filename,
          mimetype: input.mimetype,
          buffer: input.buffer,
        })

        knowledgeBaseFile.status = KnowledgeBaseFileStatus.READY
        knowledgeBaseFile.ragSourceId =
          ingested.fileId || knowledgeBaseFile.ragSourceId
        knowledgeBaseFile.chunkCount = ingested.chunkCount
        knowledgeBaseFile.processedAt = new Date().toISOString()
        knowledgeBaseFile.errorMessage = undefined
        return await updateKnowledgeBaseFile(knowledgeBaseFile)
      }

      await enqueueRagFileIngestion({
        workspaceId,
        knowledgeBaseId: input.knowledgeBaseId,
        fileId: knowledgeBaseFile._id!,
        objectStoreKey,
      })

      return knowledgeBaseFile
    } catch (error: any) {
      knowledgeBaseFile.status = KnowledgeBaseFileStatus.FAILED
      knowledgeBaseFile.errorMessage =
        error?.message || "Failed to process uploaded file"
      knowledgeBaseFile.chunkCount = 0
      await updateKnowledgeBaseFile(knowledgeBaseFile)
      throw error
    }
  } catch (error: any) {
    await objectStore
      .deleteFile(ObjectStoreBuckets.APPS, objectStoreKey)
      .catch(() => {
        // Ignore, it might not exist
      })
    throw error
  }
}
