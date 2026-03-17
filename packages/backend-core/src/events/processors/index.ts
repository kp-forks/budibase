import AnalyticsProcessor from "./AnalyticsProcessor"
import LoggingProcessor from "./LoggingProcessor"
import AuditLogsProcessor from "./AuditLogsProcessor"
import EventBrokerProcessor from "./EventBrokerProcessor"
import Processors from "./Processors"
import { AuditLogFn } from "@budibase/types"

export const analyticsProcessor = new AnalyticsProcessor()
const loggingProcessor = new LoggingProcessor()
const auditLogsProcessor = new AuditLogsProcessor()
const eventBrokerProcessor = new EventBrokerProcessor()

export function init(auditingFn: AuditLogFn) {
  return AuditLogsProcessor.init(auditingFn)
}

export const processors = new Processors([
  analyticsProcessor,
  loggingProcessor,
  auditLogsProcessor,
  eventBrokerProcessor,
])
