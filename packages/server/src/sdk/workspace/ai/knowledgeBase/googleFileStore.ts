import { HTTPError } from "@budibase/backend-core"
import fetch from "node-fetch"
import environment from "../../../../environment"
import { getKeySettings } from "../configs/litellm"

interface CreateVectorStoreResponse {
  id?: string
}

interface GoogleIngestResponse {
  file_id?: string
  fileId?: string
  chunk_count?: number
  chunkCount?: number
}

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const getCommonAuthHeaders = async () => {
  const { secretKey } = await getKeySettings()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secretKey}`,
  }
}

export async function createGoogleFileStore(name: string): Promise<string> {
  const geminiApiKey = getGeminiApiKey()
  const response = await fetch(`${environment.LITELLM_URL}/v1/vector_stores`, {
    method: "POST",
    headers: await getCommonAuthHeaders(),
    body: JSON.stringify({
      name,
      custom_llm_provider: "gemini",
      ...(geminiApiKey ? { api_key: geminiApiKey } : {}),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    if (
      text.includes("PERMISSION_DENIED") ||
      text.includes("unregistered callers")
    ) {
      throw new HTTPError(
        "Gemini File Search authentication failed. Configure GEMINI_API_KEY (or GOOGLE_API_KEY) on the LiteLLM service, or provide api_key in the request.",
        400
      )
    }
    throw new HTTPError(
      text || "Failed to create Google file store",
      response.status
    )
  }

  const payload = (await response.json()) as CreateVectorStoreResponse
  if (!payload.id) {
    throw new HTTPError("Google file store creation did not return an id", 500)
  }

  return payload.id
}

export async function ingestGoogleFile({
  vectorStoreId,
  filename,
  mimetype,
  buffer,
}: {
  vectorStoreId: string
  filename: string
  mimetype?: string
  buffer: Buffer
}): Promise<{ fileId?: string; chunkCount: number }> {
  const geminiApiKey = getGeminiApiKey()
  const response = await fetch(`${environment.LITELLM_URL}/v1/rag/ingest`, {
    method: "POST",
    headers: await getCommonAuthHeaders(),
    body: JSON.stringify({
      file: {
        filename,
        content: buffer.toString("base64"),
        content_type: mimetype || "application/octet-stream",
      },
      ingest_options: {
        name: filename,
        vector_store: {
          custom_llm_provider: "gemini",
          vector_store_id: vectorStoreId,
          ...(geminiApiKey ? { api_key: geminiApiKey } : {}),
        },
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    if (
      text.includes("PERMISSION_DENIED") ||
      text.includes("unregistered callers")
    ) {
      throw new HTTPError(
        "Gemini File Search authentication failed. Configure GEMINI_API_KEY (or GOOGLE_API_KEY) on the LiteLLM service, or provide api_key in the request.",
        400
      )
    }
    throw new HTTPError(text || "Failed to ingest file into Gemini store", 400)
  }

  const payload = (await response.json()) as GoogleIngestResponse
  return {
    fileId: payload.file_id || payload.fileId,
    chunkCount: Number(payload.chunk_count || payload.chunkCount || 0),
  }
}
