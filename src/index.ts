declare const Deno: { env: { toObject(): Record<string, string> } } | undefined

type EnvType =
  | "string"
  | "string!"
  | "number"
  | "port"
  | "boolean"
  | "url"
  | "email"
  | "json"
  | `${string}:client`
  | readonly string[]

type EnvSchema = Record<string, EnvType>

type InferType<T extends EnvType> = T extends "string"
  ? string | undefined
  : T extends "string!"
    ? string
    : T extends "number" | "port"
      ? number | undefined
      : T extends "boolean"
        ? boolean
        : T extends "url"
          ? string | undefined
          : T extends "email"
            ? string | undefined
            : T extends "json"
              ? unknown
              : T extends `${string}:client`
                ? string | undefined
                : T extends readonly string[]
                  ? T[number]
                  : never

type InferEnv<T extends EnvSchema> = {
  readonly [K in keyof T]: InferType<T[K]>
}

function parse(value: string | undefined, type: EnvType): unknown {
  if (value === undefined || value === "") {
    if (type === "string!" || (Array.isArray(type) && type.length > 0)) {
      return undefined
    }
    return undefined
  }

  if (Array.isArray(type)) {
    if (!type.includes(value)) {
      throw new Error(`must be one of: ${type.join(", ")}`)
    }
    return value
  }

  const baseType = typeof type === "string" ? type.replace(":client", "") : type

  switch (baseType) {
    case "string":
    case "string!":
      return value

    case "number":
      const num = Number(value)
      if (isNaN(num)) throw new Error("must be a number")
      return num

    case "port":
      const port = Number(value)
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error("must be a valid port (1-65535)")
      }
      return port

    case "boolean":
      const lower = value.toLowerCase()
      if (["true", "1", "yes", "on"].includes(lower)) return true
      if (["false", "0", "no", "off"].includes(lower)) return false
      throw new Error("must be a boolean")

    case "url":
      try {
        new URL(value)
        return value
      } catch {
        throw new Error("must be a valid URL")
      }

    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error("must be a valid email")
      }
      return value

    case "json":
      try {
        return JSON.parse(value)
      } catch {
        throw new Error("must be valid JSON")
      }

    default:
      return value
  }
}

function getEnvSource(): Record<string, string | undefined> {
  if (typeof process !== "undefined" && process.env) {
    return process.env
  }
  if (typeof Deno !== "undefined" && Deno) {
    return Deno.env.toObject()
  }
  return {}
}

export function snap<T extends EnvSchema>(schema: T): InferEnv<T> {
  const source = getEnvSource()
  const result: Record<string, unknown> = {}
  const errors: string[] = []

  for (const [key, type] of Object.entries(schema)) {
    const value = source[key]

    try {
      const parsed = parse(value, type as EnvType)

      if (parsed === undefined) {
        const isRequired =
          type === "string!" || (Array.isArray(type) && type.length > 0)
        if (isRequired) {
          errors.push(`${key}: required but not set`)
          continue
        }
      }

      result[key] = parsed
    } catch (e) {
      errors.push(`${key}: ${(e as Error).message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`snapenv validation failed:\n  ${errors.join("\n  ")}`)
  }

  return Object.freeze(result) as InferEnv<T>
}

export type { EnvSchema, EnvType, InferEnv }
