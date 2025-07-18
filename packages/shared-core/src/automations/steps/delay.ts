import {
  AutomationActionStepId,
  AutomationIOType,
  AutomationStepDefinition,
  AutomationStepType,
} from "@budibase/types"

export const definition: AutomationStepDefinition = {
  name: "Delay",
  icon: "clock",
  tagline: "Delay for {{inputs.time}} milliseconds",
  description: "Delay the automation until an amount of time has passed",
  stepId: AutomationActionStepId.DELAY,
  internal: true,
  features: {},
  inputs: {},
  schema: {
    inputs: {
      properties: {
        time: {
          type: AutomationIOType.NUMBER,
          title: "Delay in milliseconds",
        },
      },
      required: ["time"],
    },
    outputs: {
      properties: {
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether the delay was successful",
        },
      },
      required: ["success"],
    },
  },
  type: AutomationStepType.LOGIC,
}
