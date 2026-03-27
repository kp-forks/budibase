import { auth } from "@budibase/backend-core"
import { KnowledgeBaseType } from "@budibase/types"
import Joi from "joi"

const REQUIRED_STRING = Joi.string().required()
const KB_TYPE = Joi.string().valid(...Object.values(KnowledgeBaseType))

const LOCAL_KB_CONFIG = Joi.object({
  embeddingModel: REQUIRED_STRING,
  vectorDb: REQUIRED_STRING,
})

const GEMINI_KB_CONFIG = Joi.object({
  googleFileStoreId: REQUIRED_STRING,
}).unknown(true)

export function createKnowledgeBaseValidator() {
  return auth.joiValidator.body(
    Joi.object({
      name: REQUIRED_STRING,
      type: KB_TYPE,
      config: Joi.when("type", {
        is: KnowledgeBaseType.GEMINI,
        then: Joi.forbidden(),
        otherwise: LOCAL_KB_CONFIG.required(),
      }),
    })
  )
}

export function updateKnowledgeBaseValidator() {
  return auth.joiValidator.body(
    Joi.object({
      _id: REQUIRED_STRING,
      _rev: REQUIRED_STRING,
      name: REQUIRED_STRING,
      type: KB_TYPE.required(),
      config: Joi.when("type", {
        is: KnowledgeBaseType.GEMINI,
        then: Joi.alternatives()
          .try(Joi.object().unknown(true), GEMINI_KB_CONFIG)
          .optional(),
        otherwise: LOCAL_KB_CONFIG.required(),
      }),
    }).unknown(true)
  )
}
