declare const Deno: { env: { toObject(): Record<string, string> } } | undefined

type BaseType =
  | "string"
  | "string!"
  | "number"
  | "number!"
  | "integer"
  | "integer!"
  | "port"
  | "port!"
  | "boolean"
  | "boolean!"
  | "url"
  | "url!"
  | "email"
  | "email!"
  | "host"
  | "host!"
  | "uuid"
  | "uuid!"
  | "json"
  | "json!"

type WithDefault<T extends string> = `${T}=${string}`

type EnvType = BaseType | WithDefault<BaseType> | readonly string[]

type EnvSchema = Record<string, EnvType>

type IsRequired<T extends string> = T extends `${infer Base}!${string}`
  ? true
  : T extends `${string}=${string}`
    ? true
    : false

type ExtractBase<T extends string> = T extends `${infer Base}!`
  ? Base
  : T extends `${infer Base}=${string}`
    ? ExtractBase<Base>
    : T

type BaseToType<T extends string> = T extends "string" | "string!"
  ? string
  : T extends "number" | "number!" | "integer" | "integer!" | "port" | "port!"
    ? number
    : T extends "boolean" | "boolean!"
      ? boolean
      : T extends "url" | "url!" | "email" | "email!" | "host" | "host!" | "uuid" | "uuid!"
        ? string
        : T extends "json" | "json!"
          ? unknown
          : string

type InferType<T extends EnvType> = T extends readonly string[]
  ? T[number]
  : T extends string
    ? IsRequired<T> extends true
      ? BaseToType<ExtractBase<T>>
      : BaseToType<ExtractBase<T>> | undefined
    : never

type InferEnv<T extends EnvSchema> = {
  readonly [K in keyof T]: InferType<T[K]>
}

type Options = {
  source?: Record<string, string | undefined>
  onError?: "throw" | "log" | ((errors: string[]) => void)
  emptyAsUndefined?: boolean
}

const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  host: /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})$/i,
}

function extractType(type: string): { base: string; required: boolean; defaultValue?: string } {
  const hasDefault = type.includes("=")
  if (hasDefault) {
    const eqIndex = type.indexOf("=")
    const beforeEq = type.slice(0, eqIndex)
    const defaultValue = type.slice(eqIndex + 1)
    const required = beforeEq.endsWith("!")
    const base = required ? beforeEq.slice(0, -1) : beforeEq
    return { base, required: true, defaultValue }
  }
  const required = type.endsWith("!")
  const base = required ? type.slice(0, -1) : type
  return { base, required, defaultValue: undefined }
}

function parse(
  value: string | undefined,
  type: EnvType,
  key: string,
  emptyAsUndefined: boolean
): { value: unknown; error?: string } {
  if (Array.isArray(type)) {
    if (value === undefined || (emptyAsUndefined && value === "")) {
      return { value: undefined, error: `required, must be one of: ${type.join(", ")}` }
    }
    if (!type.includes(value)) {
      return { value: undefined, error: `must be one of: ${type.join(", ")}, got "${value}"` }
    }
    return { value }
  }

  const { base, required, defaultValue } = extractType(type as string)

  let raw = value
  if ((raw === undefined || (emptyAsUndefined && raw === "")) && defaultValue !== undefined) {
    raw = defaultValue
  }

  if (raw === undefined || (emptyAsUndefined && raw === "")) {
    if (required) {
      return { value: undefined, error: "required but not set" }
    }
    return { value: undefined }
  }

  switch (base) {
    case "string":
      return { value: raw }

    case "number": {
      const num = Number(raw)
      if (isNaN(num)) {
        return { value: undefined, error: `must be a number, got "${raw}"` }
      }
      return { value: num }
    }

    case "integer": {
      const num = Number(raw)
      if (isNaN(num) || !Number.isInteger(num)) {
        return { value: undefined, error: `must be an integer, got "${raw}"` }
      }
      return { value: num }
    }

    case "port": {
      const port = Number(raw)
      if (isNaN(port) || !Number.isInteger(port) || port < 1 || port > 65535) {
        return { value: undefined, error: `must be a valid port (1-65535), got "${raw}"` }
      }
      return { value: port }
    }

    case "boolean": {
      const lower = raw.toLowerCase()
      if (["true", "1", "yes", "on"].includes(lower)) return { value: true }
      if (["false", "0", "no", "off"].includes(lower)) return { value: false }
      return { value: undefined, error: `must be a boolean, got "${raw}"` }
    }

    case "url":
      try {
        new URL(raw)
        return { value: raw }
      } catch {
        return { value: undefined, error: `must be a valid URL, got "${raw}"` }
      }

    case "email":
      if (!patterns.email.test(raw)) {
        return { value: undefined, error: `must be a valid email, got "${raw}"` }
      }
      return { value: raw }

    case "host":
      if (!patterns.host.test(raw)) {
        return { value: undefined, error: `must be a valid host, got "${raw}"` }
      }
      return { value: raw }

    case "uuid":
      if (!patterns.uuid.test(raw)) {
        return { value: undefined, error: `must be a valid UUID, got "${raw}"` }
      }
      return { value: raw }

    case "json":
      try {
        return { value: JSON.parse(raw) }
      } catch {
        return { value: undefined, error: `must be valid JSON, got "${raw}"` }
      }

    default:
      return { value: raw }
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

export function snap<T extends EnvSchema>(schema: T, options: Options = {}): InferEnv<T> {
  const source = options.source ?? getEnvSource()
  const emptyAsUndefined = options.emptyAsUndefined ?? true
  const result: Record<string, unknown> = {}
  const errors: string[] = []

  for (const [key, type] of Object.entries(schema)) {
    const { value, error } = parse(source[key], type as EnvType, key, emptyAsUndefined)
    if (error) {
      errors.push(`${key}: ${error}`)
    } else {
      result[key] = value
    }
  }

  if (errors.length > 0) {
    const message = `snapenv validation failed:\n  ${errors.join("\n  ")}`
    if (options.onError === "log") {
      console.error(message)
    } else if (typeof options.onError === "function") {
      options.onError(errors)
    } else {
      throw new Error(message)
    }
  }

  return Object.freeze(result) as InferEnv<T>
}

export function createSnap(defaultOptions: Options) {
  return <T extends EnvSchema>(schema: T, options: Options = {}) =>
    snap(schema, { ...defaultOptions, ...options })
}

export type { EnvSchema, EnvType, InferEnv, Options }
