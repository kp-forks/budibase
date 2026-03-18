import { it, expect, describe } from "vitest"
import { applyBaseUrl } from "./query"

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
