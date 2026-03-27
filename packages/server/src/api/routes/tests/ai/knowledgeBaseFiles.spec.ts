import nock from "nock"
import { features } from "@budibase/backend-core"
import { utils } from "@budibase/backend-core/tests"
import {
  FeatureFlag,
  KnowledgeBaseFileStatus,
  KnowledgeBaseType,
} from "@budibase/types"
import environment from "../../../../environment"
import { getQueue } from "../../../../sdk/workspace/ai/rag/queue"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"

jest.mock("../../../../sdk/workspace/ai/vectorDb/pgVectorDb", () => {
  const actual = jest.requireActual(
    "../../../../sdk/workspace/ai/vectorDb/pgVectorDb"
  )
  return {
    ...actual,
    validatePgVectorDbConfig: jest.fn().mockResolvedValue(undefined),
  }
})

describe("knowledge base files", () => {
  const config = new TestConfiguration()

  const withRagEnabled = async <T>(f: () => Promise<T>) => {
    return await features.testutils.withFeatureFlags(
      config.getTenantId(),
      { [FeatureFlag.AI_RAG]: true },
      f
    )
  }

  afterAll(() => {
    config.end()
  })

  beforeEach(async () => {
    await config.newTenant()
    jest.restoreAllMocks()
    nock.cleanAll()
  })

  const fileBuffer = Buffer.from("Hello from Budibase")

  const mockLiteLLMProviders = () =>
    nock(environment.LITELLM_URL)
      .persist()
      .get("/public/providers/fields")
      .reply(200, [
        {
          provider: "OpenAI",
          provider_display_name: "OpenAI",
          litellm_provider: "openai",
          credential_fields: [
            { key: "api_key", label: "API Key", field_type: "password" },
            { key: "api_base", label: "Base URL", field_type: "text" },
          ],
        },
      ])

  const mockLiteLLMModelCostMap = () =>
    nock(environment.LITELLM_URL)
      .persist()
      .get("/public/litellm_model_cost_map")
      .reply(200, {
        "text-embedding-3-small": {
          litellm_provider: "openai",
          mode: "embedding",
        },
      })

  const createKnowledgeBase = async () => {
    mockLiteLLMProviders()
    mockLiteLLMModelCostMap()

    const liteLLMScope = nock(environment.LITELLM_URL)
      .post("/team/new")
      .reply(200, { team_id: "team-2" })
      .post("/key/generate")
      .reply(200, { token_id: "embed-key-2", key: "embed-secret-2" })
      .post("/v1/vector_stores")
      .reply(200, { id: "vector-store-1" })
      .post("/key/update")
      .reply(200, { status: "success" })

    const kb = await config.api.knowledgeBase.create({
      name: "Support KB",
      type: KnowledgeBaseType.GEMINI,
    })

    expect(liteLLMScope.isDone()).toBe(true)
    return kb
  }

  const mockGeminiIngest = (fileId: string) =>
    nock(environment.LITELLM_URL)
      .post("/v1/rag/ingest")
      .reply(200, { file_id: fileId })

  const mockGeminiFileDelete = (vectorStoreId: string, fileId: string) =>
    nock(environment.LITELLM_URL)
      .delete(
        `/v1/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(fileId)}`
      )
      .reply(200, { deleted: true })

  it("uploads and lists knowledge base files", async () => {
    await withRagEnabled(async () => {
      const knowledgeBase = await createKnowledgeBase()
      const ingestScope = mockGeminiIngest("gemini-file-1")

      const upload = await config.api.knowledgeBaseFiles.upload(
        knowledgeBase._id!,
        {
          file: fileBuffer,
          name: "notes.txt",
        }
      )

      expect(upload.file.status).toBe(KnowledgeBaseFileStatus.PROCESSING)
      expect(upload.file.filename).toBe("notes.txt")

      await utils.queue.processMessages(getQueue().getBullQueue())

      expect(ingestScope.isDone()).toBe(true)
      const { files } = await config.api.knowledgeBaseFiles.fetch(
        knowledgeBase._id!
      )
      expect(files).toHaveLength(1)
      expect(files[0].status).toBe(KnowledgeBaseFileStatus.READY)
      expect(files[0].ragSourceId).toBe("gemini-file-1")
    })
  })

  it("deletes knowledge base files", async () => {
    await withRagEnabled(async () => {
      const knowledgeBase = await createKnowledgeBase()
      const ingestScope = mockGeminiIngest("gemini-file-2")
      const deleteScope = mockGeminiFileDelete(
        "vector-store-1",
        "gemini-file-2"
      )
      const upload = await config.api.knowledgeBaseFiles.upload(
        knowledgeBase._id!,
        {
          file: fileBuffer,
          name: "docs.txt",
        }
      )

      await utils.queue.processMessages(getQueue().getBullQueue())
      expect(ingestScope.isDone()).toBe(true)

      const response = await config.api.knowledgeBaseFiles.remove(
        knowledgeBase._id!,
        upload.file._id!
      )
      expect(response.deleted).toBe(true)
      expect(deleteScope.isDone()).toBe(true)

      const { files } = await config.api.knowledgeBaseFiles.fetch(
        knowledgeBase._id!
      )
      expect(files).toHaveLength(0)
    })
  })
})
