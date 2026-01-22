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
  })

  env.PORT      // number (3000 if not set)
  env.DEBUG     // boolean (false if not set)
  env.NODE_ENV  // "development" | "production" | "test"

> features?

  ✓ zero dependencies
  ✓ full typescript inference
  ✓ runtime parsing (actual numbers, booleans)
  ✓ default values
  ✓ works everywhere (node, deno, bun, edge)

> types?

  string    any string              string | undefined
  string!   required string         string
  number    parsed number           number | undefined
  integer   whole number only       number | undefined
  port      valid port 1-65535      number | undefined
  boolean   true/false, 1/0, yes/no boolean | undefined
  url       valid url               string | undefined
  email     valid email             string | undefined
  host      hostname or ip          string | undefined
  uuid      valid uuid              string | undefined
  json      parsed json             unknown
  [...]     enum of values          union type

  add ! to make required: number!, url!, email!
  add =value for defaults: port=3000, boolean=false

> install?

  bun add snapenv
  npm install snapenv

> license?

  mit
```
