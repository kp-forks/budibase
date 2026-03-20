import { HTTPError } from "@budibase/backend-core"
import fetch from "node-fetch"
import environment from "../../../../environment"
import { getKeySettings } from "../configs/litellm"

interface CreateVectorStoreResponse {
  id?: string
}

export async function createGoogleFileStore(name: string): Promise<string> {
  const { secretKey } = await getKeySettings()
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  const response = await fetch(`${environment.LITELLM_URL}/v1/vector_stores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
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
