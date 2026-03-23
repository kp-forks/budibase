import { auth } from "@budibase/backend-core"
import { KnowledgeBaseType } from "@budibase/types"
import Joi from "joi"

const REQUIRED_STRING = Joi.string().required()
const KB_TYPE = Joi.string().valid(...Object.values(KnowledgeBaseType))

export function createKnowledgeBaseValidator() {
  return auth.joiValidator.body(
    Joi.object({
      name: REQUIRED_STRING,
      type: KB_TYPE,
      embeddingModel: Joi.when("type", {
        is: KnowledgeBaseType.LOCAL,
        then: REQUIRED_STRING,
        otherwise: Joi.string().allow("").optional(),
      }),
      vectorDb: Joi.when("type", {
        is: KnowledgeBaseType.LOCAL,
        then: REQUIRED_STRING,
        otherwise: Joi.string().allow("").optional(),
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
      type: KB_TYPE,
      embeddingModel: Joi.when("type", {
        is: KnowledgeBaseType.LOCAL,
        then: REQUIRED_STRING,
        otherwise: Joi.string().allow("").optional(),
      }),
      vectorDb: Joi.when("type", {
        is: KnowledgeBaseType.LOCAL,
        then: REQUIRED_STRING,
        otherwise: Joi.string().allow("").optional(),
      }),
    }).unknown(true)
  )
}
