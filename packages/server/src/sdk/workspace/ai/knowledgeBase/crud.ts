import { context, docIds, HTTPError } from "@budibase/backend-core"
import {
  AIConfigType,
  CreateKnowledgeBaseRequest,
  DocumentType,
  GeminiKnowledgeBase,
  KnowledgeBase,
  KnowledgeBaseType,
  LocalKnowledgeBase,
  UpdateKnowledgeBaseRequest,
} from "@budibase/types"
import * as configSdk from "../configs"
import * as knowledgeBaseFileSdk from "./files"
import * as vectorDbSdk from "../vectorDb"
import { createGoogleFileStore } from "./googleFileStore"
import { utils } from "@budibase/shared-core"

const normalizeKnowledgeBaseName = (name: string | undefined) =>
  name?.trim().toLowerCase() || ""

const validateReferences = async (knowledgeBase: KnowledgeBase) => {
  if (knowledgeBase.type === KnowledgeBaseType.GEMINI) {
    return
  }

  const { embeddingModel, vectorDb } = knowledgeBase.config

  if (!embeddingModel) {
    throw new HTTPError(
      "Embedding model is required for local knowledge bases",
      400
    )
  }
  if (!vectorDb) {
    throw new HTTPError(
      "Vector store is required for local knowledge bases",
      400
    )
  }

  const embeddingConfig = await configSdk.find(embeddingModel)
  if (!embeddingConfig) {
    throw new HTTPError("Embedding model not found", 404)
  }
  if (embeddingConfig.configType !== AIConfigType.EMBEDDINGS) {
    throw new HTTPError("Embedding model must be an embeddings config", 400)
  }

  const vectorDbConfig = await vectorDbSdk.find(vectorDb)
  if (!vectorDbConfig) {
    throw new HTTPError("Vector store config not found", 404)
  }
}

export async function fetch(): Promise<KnowledgeBase[]> {
  const db = context.getWorkspaceDB()
  const result = await db.allDocs<KnowledgeBase>(
    docIds.getDocParams(DocumentType.KNOWLEDGE_BASE, undefined, {
      include_docs: true,
    })
  )

  return result.rows
    .map(row => row.doc)
    .filter((doc): doc is KnowledgeBase => !!doc)
}

export async function findByEmbeddingModel(
  embeddingModelId: string
): Promise<KnowledgeBase[]> {
  const knowledgeBases = await fetch()
  return knowledgeBases.filter(
    knowledgeBase =>
      knowledgeBase.type === KnowledgeBaseType.LOCAL &&
      knowledgeBase.config.embeddingModel === embeddingModelId
  )
}

export async function findByVectorDb(
  vectorDbId: string
): Promise<KnowledgeBase[]> {
  const knowledgeBases = await fetch()
  return knowledgeBases.filter(
    knowledgeBase =>
      knowledgeBase.type === KnowledgeBaseType.LOCAL &&
      knowledgeBase.config.vectorDb === vectorDbId
  )
}

export async function find(id: string): Promise<KnowledgeBase | undefined> {
  const db = context.getWorkspaceDB()
  const result = await db.tryGet<KnowledgeBase>(id)
  if (!result || result._deleted) {
    return undefined
  }
  return result
}

const ensureUniqueName = async (
  name: string,
  currentId?: string
): Promise<void> => {
  const knowledgeBases = await fetch()
  const normalizedName = normalizeKnowledgeBaseName(name)
  const duplicate = knowledgeBases.find(
    knowledgeBase =>
      knowledgeBase._id !== currentId &&
      normalizeKnowledgeBaseName(knowledgeBase.name) === normalizedName
  )

  if (duplicate) {
    throw new HTTPError("Knowledge base name already exists", 400)
  }
}

export async function create(
  config: CreateKnowledgeBaseRequest
): Promise<KnowledgeBase> {
  const db = context.getWorkspaceDB()
  const knowledgeBaseType = config.type
  await ensureUniqueName(config.name)

  let newConfig: KnowledgeBase
  switch (knowledgeBaseType) {
    case KnowledgeBaseType.GEMINI: {
      const googleFileStoreId = await createGoogleFileStore(config.name.trim())
      newConfig = {
        _id: docIds.generateKnowledgeBaseID(),
        name: config.name.trim(),
        type: KnowledgeBaseType.GEMINI,
        config: {
          googleFileStoreId,
        },
      } satisfies GeminiKnowledgeBase
      break
    }
    case KnowledgeBaseType.LOCAL: {
      newConfig = {
        _id: docIds.generateKnowledgeBaseID(),
        name: config.name.trim(),
        type: KnowledgeBaseType.LOCAL,
        config: {
          embeddingModel: config.config.embeddingModel,
          vectorDb: config.config.vectorDb,
        },
      } satisfies LocalKnowledgeBase
      break
    }
    default:
      throw utils.unreachable(knowledgeBaseType)
  }
  await validateReferences(newConfig)

  const { rev } = await db.put(newConfig)
  newConfig._rev = rev

  return newConfig
}

export async function update(
  config: UpdateKnowledgeBaseRequest
): Promise<KnowledgeBase> {
  if (!config._id || !config._rev) {
    throw new HTTPError("id and rev required", 400)
  }

  const db = context.getWorkspaceDB()
  const existing = await db.tryGet<KnowledgeBase>(config._id)
  if (!existing) {
    throw new HTTPError("Knowledge base not found", 404)
  }

  let updated: KnowledgeBase
  const knowledgeBaseType = config.type
  switch (knowledgeBaseType) {
    case KnowledgeBaseType.GEMINI: {
      if (knowledgeBaseType !== existing.type) {
        throw new HTTPError("Knowledge base type cannot be changed", 400)
      }
      updated = {
        ...existing,
        ...config,
        type: KnowledgeBaseType.GEMINI,
        config: { googleFileStoreId: existing.config.googleFileStoreId },
      } satisfies GeminiKnowledgeBase
      break
    }
    case KnowledgeBaseType.LOCAL: {
      if (knowledgeBaseType !== existing.type) {
        throw new HTTPError("Knowledge base type cannot be changed", 400)
      }
      updated = {
        ...existing,
        ...config,
        type: KnowledgeBaseType.LOCAL,
        config: {
          embeddingModel: config.config.embeddingModel,
          vectorDb: config.config.vectorDb,
        },
      } satisfies LocalKnowledgeBase

      const referencesChanged =
        existing.config.embeddingModel !== updated.config.embeddingModel ||
        existing.config.vectorDb !== updated.config.vectorDb

      if (referencesChanged) {
        const files = await knowledgeBaseFileSdk.listKnowledgeBaseFiles(
          config._id
        )
        if (files.length > 0) {
          throw new HTTPError(
            "Embedding model and vector database cannot be changed after files are added",
            400
          )
        }
      }
      break
    }
    default:
      throw utils.unreachable(knowledgeBaseType)
  }

  await validateReferences(updated)
  if (
    updated.type === KnowledgeBaseType.GEMINI &&
    !updated.config.googleFileStoreId
  ) {
    throw new HTTPError(
      "Google knowledge base is missing its file store configuration",
      400
    )
  }
  await ensureUniqueName(updated.name, updated._id)
  updated.name = updated.name.trim()

  const { rev } = await db.put(updated)
  updated._rev = rev

  return updated
}

export async function remove(id: string) {
  const db = context.getWorkspaceDB()

  const existing = await db.get<KnowledgeBase>(id)
  await db.remove(existing)
}
