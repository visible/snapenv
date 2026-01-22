import { expect, test, describe } from "bun:test"
import { snap, validate } from "./index"

describe("snap", () => {
  describe("string", () => {
    test("parses string", () => {
      const env = snap({ FOO: "string" }, { source: { FOO: "bar" } })
      expect(env.FOO).toBe("bar")
    })

    test("optional string returns undefined", () => {
      const env = snap({ FOO: "string" }, { source: {} })
      expect(env.FOO).toBeUndefined()
    })

    test("required string throws", () => {
      expect(() => snap({ FOO: "string!" }, { source: {} })).toThrow()
    })

    test("required string with value", () => {
      const env = snap({ FOO: "string!" }, { source: { FOO: "bar" } })
      expect(env.FOO).toBe("bar")
    })
  })

  describe("number", () => {
    test("parses number", () => {
      const env = snap({ PORT: "number" }, { source: { PORT: "3000" } })
      expect(env.PORT).toBe(3000)
    })

    test("parses negative number", () => {
      const env = snap({ NUM: "number" }, { source: { NUM: "-42" } })
      expect(env.NUM).toBe(-42)
    })

    test("parses float", () => {
      const env = snap({ NUM: "number" }, { source: { NUM: "3.14" } })
      expect(env.NUM).toBe(3.14)
    })

    test("invalid number throws", () => {
      expect(() => snap({ NUM: "number!" }, { source: { NUM: "abc" } })).toThrow()
    })
  })

  describe("integer", () => {
    test("parses integer", () => {
      const env = snap({ COUNT: "integer" }, { source: { COUNT: "42" } })
      expect(env.COUNT).toBe(42)
    })

    test("rejects float", () => {
      expect(() => snap({ COUNT: "integer!" }, { source: { COUNT: "3.14" } })).toThrow()
    })
  })

  describe("port", () => {
    test("parses valid port", () => {
      const env = snap({ PORT: "port" }, { source: { PORT: "8080" } })
      expect(env.PORT).toBe(8080)
    })

    test("rejects port 0", () => {
      expect(() => snap({ PORT: "port!" }, { source: { PORT: "0" } })).toThrow()
    })

    test("rejects port > 65535", () => {
      expect(() => snap({ PORT: "port!" }, { source: { PORT: "70000" } })).toThrow()
    })
  })

  describe("boolean", () => {
    test("parses true values", () => {
      for (const val of ["true", "TRUE", "1", "yes", "YES", "on", "ON"]) {
        const env = snap({ DEBUG: "boolean" }, { source: { DEBUG: val } })
        expect(env.DEBUG).toBe(true)
      }
    })

    test("parses false values", () => {
      for (const val of ["false", "FALSE", "0", "no", "NO", "off", "OFF"]) {
        const env = snap({ DEBUG: "boolean" }, { source: { DEBUG: val } })
        expect(env.DEBUG).toBe(false)
      }
    })

    test("invalid boolean throws", () => {
      expect(() => snap({ DEBUG: "boolean!" }, { source: { DEBUG: "maybe" } })).toThrow()
    })
  })

  describe("url", () => {
    test("parses valid url", () => {
      const env = snap({ API: "url" }, { source: { API: "https://api.example.com" } })
      expect(env.API).toBe("https://api.example.com")
    })

    test("invalid url throws", () => {
      expect(() => snap({ API: "url!" }, { source: { API: "not-a-url" } })).toThrow()
    })
  })

  describe("email", () => {
    test("parses valid email", () => {
      const env = snap({ EMAIL: "email" }, { source: { EMAIL: "test@example.com" } })
      expect(env.EMAIL).toBe("test@example.com")
    })

    test("invalid email throws", () => {
      expect(() => snap({ EMAIL: "email!" }, { source: { EMAIL: "invalid" } })).toThrow()
    })
  })

  describe("host", () => {
    test("parses domain", () => {
      const env = snap({ HOST: "host" }, { source: { HOST: "example.com" } })
      expect(env.HOST).toBe("example.com")
    })

    test("parses localhost", () => {
      const env = snap({ HOST: "host" }, { source: { HOST: "localhost" } })
      expect(env.HOST).toBe("localhost")
    })

    test("parses ip", () => {
      const env = snap({ HOST: "host" }, { source: { HOST: "192.168.1.1" } })
      expect(env.HOST).toBe("192.168.1.1")
    })

    test("invalid host throws", () => {
      expect(() => snap({ HOST: "host!" }, { source: { HOST: "http://invalid" } })).toThrow()
    })
  })

  describe("uuid", () => {
    test("parses valid uuid", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000"
      const env = snap({ ID: "uuid" }, { source: { ID: uuid } })
      expect(env.ID).toBe(uuid)
    })

    test("invalid uuid throws", () => {
      expect(() => snap({ ID: "uuid!" }, { source: { ID: "not-a-uuid" } })).toThrow()
    })
  })

  describe("json", () => {
    test("parses json object", () => {
      const env = snap({ CONFIG: "json" }, { source: { CONFIG: '{"key":"value"}' } })
      expect(env.CONFIG).toEqual({ key: "value" })
    })

    test("parses json array", () => {
      const env = snap({ LIST: "json" }, { source: { LIST: "[1,2,3]" } })
      expect(env.LIST).toEqual([1, 2, 3])
    })

    test("invalid json throws", () => {
      expect(() => snap({ CONFIG: "json!" }, { source: { CONFIG: "not json" } })).toThrow()
    })
  })

  describe("enum", () => {
    test("parses valid enum value", () => {
      const env = snap(
        { NODE_ENV: ["development", "production", "test"] as const },
        { source: { NODE_ENV: "production" } }
      )
      expect(env.NODE_ENV).toBe("production")
    })

    test("invalid enum throws", () => {
      expect(() =>
        snap(
          { NODE_ENV: ["development", "production", "test"] as const },
          { source: { NODE_ENV: "staging" } }
        )
      ).toThrow()
    })

    test("missing enum throws", () => {
      expect(() =>
        snap({ NODE_ENV: ["development", "production", "test"] as const }, { source: {} })
      ).toThrow()
    })
  })

  describe("defaults", () => {
    test("uses default when not set", () => {
      const env = snap({ PORT: "port=3000" }, { source: {} })
      expect(env.PORT).toBe(3000)
    })

    test("uses default when empty", () => {
      const env = snap({ PORT: "port=3000" }, { source: { PORT: "" } })
      expect(env.PORT).toBe(3000)
    })

    test("overrides default when set", () => {
      const env = snap({ PORT: "port=3000" }, { source: { PORT: "8080" } })
      expect(env.PORT).toBe(8080)
    })

    test("string default", () => {
      const env = snap({ HOST: "string=localhost" }, { source: {} })
      expect(env.HOST).toBe("localhost")
    })

    test("boolean default", () => {
      const env = snap({ DEBUG: "boolean=false" }, { source: {} })
      expect(env.DEBUG).toBe(false)
    })
  })

  describe("options", () => {
    test("emptyAsUndefined false keeps empty strings", () => {
      const env = snap({ FOO: "string" }, { source: { FOO: "" }, emptyAsUndefined: false })
      expect(env.FOO).toBe("")
    })

    test("onError log does not throw", () => {
      const env = snap({ FOO: "string!" }, { source: {}, onError: "log" })
      expect(env.FOO).toBeUndefined()
    })

    test("onError callback receives errors", () => {
      const errors: string[] = []
      snap({ FOO: "string!", BAR: "number!" }, { source: {}, onError: (e) => errors.push(...e) })
      expect(errors.length).toBe(2)
    })

    test("custom source", () => {
      const env = snap({ FOO: "string!" }, { source: { FOO: "custom" } })
      expect(env.FOO).toBe("custom")
    })
  })

  describe("immutability", () => {
    test("result is frozen", () => {
      const env = snap({ FOO: "string!" }, { source: { FOO: "bar" } })
      expect(Object.isFrozen(env)).toBe(true)
    })
  })

  describe("arrays", () => {
    test("parses string array", () => {
      const env = snap({ TAGS: "string[]" }, { source: { TAGS: "a, b, c" } })
      expect(env.TAGS).toEqual(["a", "b", "c"])
    })

    test("parses number array", () => {
      const env = snap({ PORTS: "number[]" }, { source: { PORTS: "80, 443, 8080" } })
      expect(env.PORTS).toEqual([80, 443, 8080])
    })

    test("invalid number array throws", () => {
      expect(() => snap({ PORTS: "number[]!" }, { source: { PORTS: "80, abc" } })).toThrow()
    })
  })

  describe("prefix", () => {
    test("reads with prefix", () => {
      const env = snap(
        { API_URL: "url!" },
        { source: { NEXT_PUBLIC_API_URL: "https://api.com" }, prefix: "NEXT_PUBLIC_" }
      )
      expect(env.API_URL).toBe("https://api.com")
    })
  })

  describe("maskSecrets", () => {
    test("masks secret keys in errors", () => {
      try {
        snap({ API_KEY: "number!" }, { source: { API_KEY: "secret123" }, maskSecrets: true })
      } catch (e) {
        expect((e as Error).message).toContain("[MASKED]")
        expect((e as Error).message).not.toContain("secret123")
      }
    })

    test("does not mask non-secret keys", () => {
      try {
        snap({ PORT: "number!" }, { source: { PORT: "abc" }, maskSecrets: true })
      } catch (e) {
        expect((e as Error).message).toContain("abc")
      }
    })
  })

  describe("error messages", () => {
    test("includes variable name", () => {
      try {
        snap({ MY_VAR: "number!" }, { source: { MY_VAR: "abc" } })
      } catch (e) {
        expect((e as Error).message).toContain("MY_VAR")
      }
    })

    test("includes received value", () => {
      try {
        snap({ MY_VAR: "number!" }, { source: { MY_VAR: "abc" } })
      } catch (e) {
        expect((e as Error).message).toContain("abc")
      }
    })
  })
})

describe("validate", () => {
  test("returns success with valid data", () => {
    const result = validate({ PORT: "port!" }, { source: { PORT: "3000" } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3000)
    }
  })

  test("returns errors without throwing", () => {
    const result = validate({ PORT: "port!" }, { source: {} })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  test("returns multiple errors", () => {
    const result = validate({ A: "string!", B: "number!" }, { source: {} })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.length).toBe(2)
    }
  })
})
