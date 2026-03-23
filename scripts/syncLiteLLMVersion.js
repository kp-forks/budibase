#!/usr/bin/env node
const fs = require("fs")
const path = require("path")

const repoRoot = path.resolve(__dirname, "..")
const versionConfigPath = path.join(repoRoot, "hosting", "litellm-version.json")

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function updateFile(filePath, updater) {
  const original = fs.readFileSync(filePath, "utf8")
  const updated = updater(original)

  if (original !== updated) {
    fs.writeFileSync(filePath, updated)
    return true
  }

  return false
}

function required(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

function replaceRequired(content, pattern, replacement, filePath) {
  if (!pattern.test(content)) {
    throw new Error(`Could not find target pattern in ${filePath}`)
  }
  return content.replace(pattern, replacement)
}

function main() {
  const versionConfig = readJson(versionConfigPath)
  const version = required(versionConfig.version, "version")
  const channel = required(versionConfig.channel, "channel")

  const imageTag = `main-v${version}-${channel}`

  const updates = [
    {
      path: path.join(repoRoot, "hosting", "single", "Dockerfile"),
      update: content =>
        replaceRequired(
          content,
          /ARG LITELLM_PYPI_VERSION=.*/,
          `ARG LITELLM_PYPI_VERSION=${version}`,
          "hosting/single/Dockerfile"
        ),
    },
    {
      path: path.join(repoRoot, "hosting", "docker-compose.yaml"),
      update: content =>
        replaceRequired(
          content,
          /image:\s*(?:docker\.litellm\.ai|ghcr\.io)\/berriai\/litellm:[^\s\n]+/,
          `image: ghcr.io/berriai/litellm:${imageTag}`,
          "hosting/docker-compose.yaml"
        ),
    },
    {
      path: path.join(repoRoot, "hosting", "docker-compose.build.yaml"),
      update: content =>
        replaceRequired(
          content,
          /image:\s*(?:docker\.litellm\.ai|ghcr\.io)\/berriai\/litellm:[^\s\n]+/,
          `image: ghcr.io/berriai/litellm:${imageTag}`,
          "hosting/docker-compose.build.yaml"
        ),
    },
    {
      path: path.join(repoRoot, "hosting", "docker-compose.dev.yaml"),
      update: content =>
        replaceRequired(
          content,
          /image:\s*(?:docker\.litellm\.ai|ghcr\.io)\/berriai\/litellm:[^\s\n]+/,
          `image: ghcr.io/berriai/litellm:${imageTag}`,
          "hosting/docker-compose.dev.yaml"
        ),
    },
    {
      path: path.join(repoRoot, "charts", "budibase", "values.yaml"),
      update: content =>
        replaceRequired(
          content,
          /image:\s*ghcr\.io\/berriai\/litellm:[^\s\n]+/,
          `image: ghcr.io/berriai/litellm:${imageTag}`,
          "charts/budibase/values.yaml"
        ),
    },
  ]

  const changed = []
  for (const item of updates) {
    if (updateFile(item.path, item.update)) {
      changed.push(path.relative(repoRoot, item.path))
    }
  }

  console.log(`LiteLLM version synced: version=${version}, channel=${channel}`)
  if (changed.length > 0) {
    console.log(`Updated files:\n${changed.join("\n")}`)
  } else {
    console.log("No files changed")
  }
}

main()
