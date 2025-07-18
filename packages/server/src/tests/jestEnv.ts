import { tmpdir } from "os"

process.env.SELF_HOSTED = "1"
process.env.NODE_ENV = "jest"
process.env.MULTI_TENANCY = "1"
process.env.APP_PORT = "0"
process.env.WORKER_PORT = "0"
// @ts-ignore
process.env.BUDIBASE_DIR = tmpdir("budibase-unittests")
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "error"
process.env.MOCK_REDIS = "1"
process.env.PLATFORM_URL = "http://localhost:10000"
process.env.REDIS_PASSWORD = "budibase"
process.env.BUDIBASE_VERSION = "0.0.0+jest"
process.env.WORKER_URL = "http://localhost:10000"
process.env.COUCH_DB_PASSWORD = "budibase"
process.env.COUCH_DB_USER = "budibase"
process.env.JWT_SECRET = "jwtsecret"
process.env.MINIO_URL = "http://localhost"
process.env.MINIO_ACCESS_KEY = "budibase"
process.env.MINIO_SECRET_KEY = "budibase"
process.env.SYNC_MIGRATION_CHECKS_MS = "10"
