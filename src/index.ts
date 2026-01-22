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
  | "string[]"
  | "string[]!"
  | "number[]"
  | "number[]!"

type WithDefault<T extends string> = `${T}=${string}`

type Validator<T = unknown> = {
  __validator: true
  parse: (value: string | undefined, key: string) => { value: T; error?: string }
  required: boolean
}

type EnvType = BaseType | WithDefault<BaseType> | readonly string[] | Validator<unknown>

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
          : T extends "string[]" | "string[]!"
            ? string[]
            : T extends "number[]" | "number[]!"
              ? number[]
              : string

type InferType<T extends EnvType> = T extends Validator<infer U>
  ? T extends { required: true }
    ? U
    : U | undefined
  : T extends readonly string[]
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
  prefix?: string
  onError?: "throw" | "log" | ((errors: string[]) => void)
  emptyAsUndefined?: boolean
  maskSecrets?: boolean
}

const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  host: /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})$/i,
}

const secretKeys = /secret|password|token|key|api|auth|credential|private/i

function isValidator(type: EnvType): type is Validator<unknown> {
  return typeof type === "object" && !Array.isArray(type) && "__validator" in type
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

function mask(value: string, key: string, shouldMask: boolean): string {
  if (!shouldMask) return `"${value}"`
  if (secretKeys.test(key)) return '"[MASKED]"'
  return `"${value}"`
}

function parse(
  value: string | undefined,
  type: EnvType,
  key: string,
  emptyAsUndefined: boolean,
  maskSecrets: boolean
): { value: unknown; error?: string } {
  if (isValidator(type)) {
    return type.parse(value, key)
  }

  if (Array.isArray(type)) {
    if (value === undefined || (emptyAsUndefined && value === "")) {
      return { value: undefined, error: `required, must be one of: ${type.join(", ")}` }
    }
    if (!type.includes(value)) {
      return { value: undefined, error: `must be one of: ${type.join(", ")}, got ${mask(value, key, maskSecrets)}` }
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
        return { value: undefined, error: `must be a number, got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: num }
    }

    case "integer": {
      const num = Number(raw)
      if (isNaN(num) || !Number.isInteger(num)) {
        return { value: undefined, error: `must be an integer, got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: num }
    }

    case "port": {
      const port = Number(raw)
      if (isNaN(port) || !Number.isInteger(port) || port < 1 || port > 65535) {
        return { value: undefined, error: `must be a valid port (1-65535), got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: port }
    }

    case "boolean": {
      const lower = raw.toLowerCase()
      if (["true", "1", "yes", "on"].includes(lower)) return { value: true }
      if (["false", "0", "no", "off"].includes(lower)) return { value: false }
      return { value: undefined, error: `must be a boolean, got ${mask(raw, key, maskSecrets)}` }
    }

    case "url":
      try {
        new URL(raw)
        return { value: raw }
      } catch {
        return { value: undefined, error: `must be a valid URL, got ${mask(raw, key, maskSecrets)}` }
      }

    case "email":
      if (!patterns.email.test(raw)) {
        return { value: undefined, error: `must be a valid email, got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: raw }

    case "host":
      if (!patterns.host.test(raw)) {
        return { value: undefined, error: `must be a valid host, got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: raw }

    case "uuid":
      if (!patterns.uuid.test(raw)) {
        return { value: undefined, error: `must be a valid UUID, got ${mask(raw, key, maskSecrets)}` }
      }
      return { value: raw }

    case "json":
      try {
        return { value: JSON.parse(raw) }
      } catch {
        return { value: undefined, error: `must be valid JSON, got ${mask(raw, key, maskSecrets)}` }
      }

    case "string[]": {
      const items = raw.split(",").map((s) => s.trim())
      return { value: items }
    }

    case "number[]": {
      const items = raw.split(",").map((s) => s.trim())
      const nums: number[] = []
      for (const item of items) {
        const num = Number(item)
        if (isNaN(num)) {
          return { value: undefined, error: `must be comma-separated numbers, got ${mask(raw, key, maskSecrets)}` }
        }
        nums.push(num)
      }
      return { value: nums }
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
  const maskSecrets = options.maskSecrets ?? false
  const prefix = options.prefix ?? ""
  const result: Record<string, unknown> = {}
  const errors: string[] = []

  for (const [key, type] of Object.entries(schema)) {
    const envKey = prefix + key
    const { value, error } = parse(source[envKey], type as EnvType, key, emptyAsUndefined, maskSecrets)
    if (error) {
      errors.push(`${envKey}: ${error}`)
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

type ValidateResult<T extends EnvSchema> =
  | { success: true; data: InferEnv<T>; errors: never }
  | { success: false; data: never; errors: string[] }

export function validate<T extends EnvSchema>(
  schema: T,
  options: Omit<Options, "onError"> = {}
): ValidateResult<T> {
  const errors: string[] = []
  const data = snap(schema, { ...options, onError: (e) => errors.push(...e) })
  if (errors.length > 0) {
    return { success: false, errors } as ValidateResult<T>
  }
  return { success: true, data } as ValidateResult<T>
}

export function extend<A extends object, B extends object>(a: A, b: B): A & B {
  return Object.freeze({ ...a, ...b }) as A & B
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return Object.freeze(result) as Pick<T, K>
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return Object.freeze(result) as Omit<T, K>
}

export function makeValidator<T>(
  fn: (value: string) => T,
  options: { required?: boolean; error?: string } = {}
): Validator<T> {
  const required = options.required ?? false
  return {
    __validator: true,
    required,
    parse: (value: string | undefined, key: string) => {
      if (value === undefined || value === "") {
        if (required) {
          return { value: undefined as T, error: "required but not set" }
        }
        return { value: undefined as T }
      }
      try {
        return { value: fn(value) }
      } catch (e) {
        return { value: undefined as T, error: options.error ?? (e as Error).message }
      }
    },
  }
}

export function regex(pattern: RegExp, options: { required?: boolean; error?: string } = {}) {
  return makeValidator<string>(
    (value) => {
      if (!pattern.test(value)) {
        throw new Error(options.error ?? `must match pattern ${pattern}`)
      }
      return value
    },
    { required: options.required, error: options.error }
  )
}

export type { EnvSchema, EnvType, InferEnv, Options, Validator }
