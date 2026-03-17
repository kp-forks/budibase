import { Event, Identity } from "@budibase/types"
import { EventProcessor } from "./types"

export default class EventBrokerProcessor implements EventProcessor {
  async processEvent(
    event: Event,
    identity: Identity,
    properties: any
  ): Promise<void> {
    // TODO: Replace this log with a real HTTP request to the Event Broker once it is available.
    // The Event Broker endpoint will receive the event payload and forward it to the internal
    // ingestion pipeline (e.g. SQS → Logstash → S3 → Snowpipe).
    console.log(`[EventBrokerProcessor] event received: ${event}`, {
      identityType: identity.type,
      properties,
    })
  }
}
