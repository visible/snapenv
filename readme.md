```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ◇  snapenv                                                 │
│                                                              │
│   typesafe env validation with zero dependencies             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

```bash
> what is this?

  a tiny library that validates and types your environment variables
  no zod, no dependencies, just one function

> example?

  const env = snap({
    DATABASE_URL: "url!",
    PORT: "port=3000",
    DEBUG: "boolean=false",
    NODE_ENV: ["development", "production", "test"],
    ALLOWED_IPS: "string[]",
  })

  env.PORT        // number (3000 if not set)
  env.DEBUG       // boolean (false if not set)
  env.NODE_ENV    // "development" | "production" | "test"
  env.ALLOWED_IPS // string[]

> features?

  ✓ zero dependencies
  ✓ full typescript inference
  ✓ runtime parsing (actual numbers, booleans, arrays)
  ✓ default values
  ✓ prefix support (NEXT_PUBLIC_, VITE_)
  ✓ secret masking in errors
  ✓ custom validators
  ✓ extend/pick/omit utilities
  ✓ works everywhere (node, deno, bun, edge)

> types?

  string      any string              string | undefined
  string!     required string         string
  number      parsed number           number | undefined
  integer     whole number only       number | undefined
  port        valid port 1-65535      number | undefined
  boolean     true/false, 1/0, yes/no boolean | undefined
  url         valid url               string | undefined
  email       valid email             string | undefined
  host        hostname or ip          string | undefined
  uuid        valid uuid              string | undefined
  json        parsed json             unknown
  string[]    comma-separated         string[] | undefined
  number[]    comma-separated numbers number[] | undefined
  [...]       enum of values          union type

  add ! to make required: number!, url!, email!
  add =value for defaults: port=3000, boolean=false

> custom validators?

  import { snap, makeValidator, regex } from "snapenv"

  // regex shorthand
  const env = snap({
    CODE: regex(/^[A-Z]{3}-\d{3}$/, { required: true }),
  })

  // fully custom
  const hex = makeValidator<string>((value) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error("must be a hex color")
    }
    return value
  }, { required: true })

  const env = snap({ COLOR: hex })

> extend/pick/omit?

  // monorepo: combine server + client env
  const server = snap({ DATABASE_URL: "url!" })
  const client = snap({ API_URL: "url!" }, { prefix: "NEXT_PUBLIC_" })
  const env = extend(server, client)

  // pick subset
  const public = pick(env, ["API_URL"])

  // omit sensitive
  const safe = omit(env, ["DATABASE_URL"])

> options?

  snap(schema, {
    source: process.env,       // custom env source
    prefix: "NEXT_PUBLIC_",    // env var prefix
    emptyAsUndefined: true,    // treat "" as undefined
    maskSecrets: true,         // hide secrets in errors
    onError: "throw",          // "throw" | "log" | (errors) => void
  })

> validate without throwing?

  const result = validate(schema, options)

  if (result.success) {
    console.log(result.data.PORT)
  } else {
    console.log(result.errors)
  }

> createSnap?

  const snap = createSnap({ prefix: "MY_APP_" })
  const env = snap({ ... })

> .env files?

  snapenv validates, it doesn't load
  use your runtime's native .env support:

  bun app.ts                        # bun auto-loads .env
  node --env-file=.env app.js       # node 20.6+
  deno run --env-file=.env app.ts   # deno
  node -r dotenv/config app.js      # older node

> install?

  bun add snapenv
  npm install snapenv

> license?

  mit
```
