import {
  PublishResourceState,
  type Agent,
  type PublishStatusResource,
} from "@budibase/types"

const LIVE_LABEL = "Live"
const STOPPED_LABEL = "Stopped"
const NOT_DEPLOYED_LABEL = "Not Deployed"

const hasAgentDeploymentHistory = (agent: Agent) =>
  !!(
    agent.publishedAt ||
    agent.discordIntegration?.chatAppId ||
    agent.discordIntegration?.interactionsEndpointUrl ||
    agent.MSTeamsIntegration?.chatAppId ||
    agent.MSTeamsIntegration?.messagingEndpointUrl ||
    agent.slackIntegration?.chatAppId ||
    agent.slackIntegration?.messagingEndpointUrl
  )

export const getPublishResourceStatusLabel = (
  publishStatus: Pick<PublishStatusResource, "state" | "deployedAt">
) => {
  if (publishStatus.state === PublishResourceState.PUBLISHED) {
    return LIVE_LABEL
  }

  return publishStatus.deployedAt ? STOPPED_LABEL : NOT_DEPLOYED_LABEL
}

export const getAgentStatusLabel = (agent: Agent) => {
  if (agent.live) {
    return LIVE_LABEL
  }

  return hasAgentDeploymentHistory(agent) ? STOPPED_LABEL : NOT_DEPLOYED_LABEL
}
