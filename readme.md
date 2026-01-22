# snapenv

env var validation and types

```ts
import { snap } from "snapenv"

const env = snap({
  DATABASE_URL: "url",
  PORT: "port",
  DEBUG: "boolean",
  NODE_ENV: ["development", "production", "test"],
  API_KEY: "string!",
})

env.PORT // number
env.DEBUG // boolean
env.NODE_ENV // "development" | "production" | "test"
```

## types

| type | description |
|------|-------------|
| `string` | any string |
| `string!` | required string |
| `number` | parsed number |
| `port` | valid port 1-65535 |
| `boolean` | true/false, 1/0, yes/no |
| `url` | valid url |
| `email` | valid email |
| `json` | parsed json |
| `[...]` | enum of values |

## install

```bash
bun add snapenv
```

[mit](LICENSE)
