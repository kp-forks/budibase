import { it, expect, describe } from "vitest"
import { applyBaseUrl, isAbsoluteUrl, resolveUrlBindings } from "./query"

describe("applyBaseUrl", () => {
  describe("plain URLs", () => {
    it("replaces the origin, keeping the path", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/users",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/users")
    })

    it("replaces the origin, keeping the query string", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/users?page=1",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/users?page=1")
    })

    it("replaces the origin, keeping path + query string + hash", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/users?page=1#top",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/users?page=1#top")
    })

    it("drops the path when current URL is just an origin with no path", () => {
      expect(
        applyBaseUrl("https://old.example.com", "https://new.example.com")
      ).toBe("https://new.example.com")
    })

    it("falls back to newBase when currentUrl is not a valid URL", () => {
      expect(applyBaseUrl("not a url", "https://new.example.com")).toBe(
        "https://new.example.com"
      )
    })

    it("falls back to newBase when currentUrl is empty", () => {
      expect(applyBaseUrl("", "https://new.example.com")).toBe(
        "https://new.example.com"
      )
    })

    it("preserves a relative path when currentUrl has no origin", () => {
      expect(applyBaseUrl("/api/v1/users", "https://new.example.com")).toBe(
        "https://new.example.com/api/v1/users"
      )
    })

    it("strips a trailing slash from newBase to avoid double slashes", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/users",
          "https://new.example.com/"
        )
      ).toBe("https://new.example.com/api/users")
    })

    it("strips trailing slash from newBase when preserving a relative path", () => {
      expect(applyBaseUrl("/api/v1/users", "https://new.example.com/")).toBe(
        "https://new.example.com/api/v1/users"
      )
    })
  })

  describe("HBS template URLs", () => {
    it("preserves HBS blocks in the path", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/{{version}}/users",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/{{version}}/users")
    })

    it("preserves HBS blocks in the query string", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/api/users?token={{auth.token}}",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/users?token={{auth.token}}")
    })

    it("preserves an HBS block in the port position", () => {
      expect(
        applyBaseUrl(
          "http://{{host}}:{{port}}/api/users",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/users")
    })

    it("preserves HBS blocks in both port and path", () => {
      expect(
        applyBaseUrl(
          "http://{{host}}:{{port}}/api/{{version}}/users",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/api/{{version}}/users")
    })

    it("preserves multiple HBS blocks in the path", () => {
      expect(
        applyBaseUrl(
          "https://old.example.com/{{org}}/{{repo}}/issues",
          "https://new.example.com"
        )
      ).toBe("https://new.example.com/{{org}}/{{repo}}/issues")
    })
  })
})

describe("isAbsoluteUrl", () => {
  it("accepts a valid http URL", () => {
    expect(isAbsoluteUrl("http://example.com/api")).toBe(true)
  })

  it("accepts a valid https URL", () => {
    expect(isAbsoluteUrl("https://example.com/api")).toBe(true)
  })

  it("rejects a relative path", () => {
    expect(isAbsoluteUrl("/api/v1/users")).toBe(false)
  })

  it("rejects an empty string", () => {
    expect(isAbsoluteUrl("")).toBe(false)
  })

  it("rejects https:google.com (missing //)", () => {
    expect(isAbsoluteUrl("https:google.com")).toBe(false)
  })

  it("rejects a non-http protocol", () => {
    expect(isAbsoluteUrl("ftp://example.com")).toBe(false)
  })

  it("rejects a URL with spaces", () => {
    expect(isAbsoluteUrl("https://some url")).toBe(false)
  })

  it("rejects a URL with percent-encoded spaces in the hostname", () => {
    expect(isAbsoluteUrl("https://some%20url")).toBe(false)
  })
})

describe("resolveUrlBindings", () => {
  const binding = (readable: string, runtime: string) => ({
    type: "context" as const,
    readableBinding: readable,
    runtimeBinding: runtime,
    category: "test",
  })

  it("resolves a runtime binding in the URL", () => {
    const mergedBindings = [binding("Binding.baseUrl", "baseUrl")]
    const context = { baseUrl: "https://api.example.com" }
    expect(
      resolveUrlBindings(
        "{{Binding.baseUrl}}/api/health",
        mergedBindings,
        context
      )
    ).toBe("https://api.example.com/api/health")
  })

  it("resolves a Connection.Static binding in the URL", () => {
    const mergedBindings = [binding("Connection.Static.serverUrl", "serverUrl")]
    const context = { serverUrl: "http://localhost:5001" }
    expect(
      resolveUrlBindings(
        "{{Connection.Static.serverUrl}}/api/health",
        mergedBindings,
        context
      )
    ).toBe("http://localhost:5001/api/health")
  })

  it("resolves a chained binding where a context value references another binding", () => {
    const mergedBindings = [
      binding("Binding.target", "target"),
      binding("Connection.Static.serverUrl", "serverUrl"),
    ]
    const context = {
      target: "{{ serverUrl }}",
      serverUrl: "http://localhost:5001",
    }
    expect(
      resolveUrlBindings(
        "{{Binding.target}}/api/health",
        mergedBindings,
        context
      )
    ).toBe("http://localhost:5001/api/health")
  })

  it("returns the URL unchanged when there are no bindings", () => {
    expect(resolveUrlBindings("https://api.example.com/health", [], {})).toBe(
      "https://api.example.com/health"
    )
  })
})
