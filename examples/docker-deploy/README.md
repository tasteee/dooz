# docker-deploy

Docker build, run, push, and compose commands unified under dooz.

The built-in `lower` filter normalises service names so `Web`, `web`, and `WEB` all map to the same image tag. A `tagIsNotLatest` validator blocks accidental `latest` pushes to the registry.

---

## Commands

| Input | Runs |
|---|---|
| `dooz build api` | `docker build -t api .` |
| `dooz build api 1.4.2` | `docker build -t api:1.4.2 .` |
| `dooz run api -p 8080:8080` | `docker run --rm -p 8080:8080 api` |
| `dooz push api 1.4.2` | `docker push api:1.4.2` |
| `dooz push api latest` | ❌ rejected by validator |
| `dooz logs api --tail 50` | `docker logs api --tail 50` |
| `dooz stop api` | `docker stop api` |
| `dooz pull worker` | `docker pull worker:latest` |
| `dooz up -d` | `docker compose up -d` |
| `dooz down` | `docker compose down` |
| `dooz status` | `docker compose ps` |

---

## Features shown

- **Built-in `lower` filter** — `{{service | lower}}` normalises casing without any extension code.
- **Specificity ranking** — `build <service> <tag>` wins over `build <service>` when two tokens follow `build`.
- **Validator** — `tagIsNotLatest` in `dooz.js` prevents a destructive `push api latest` from ever reaching the registry.
- **Passthrough flags** — `run`, `logs`, and `up` forward extra tokens (ports, `--tail`, `-d`, etc.) unchanged.

---

## Try it

```sh
# safe push — versioned tag
dooz push api 1.4.2 --dooz dry

# blocked — "latest" is rejected before docker is called
dooz push api latest --dooz dry

# run with port mapping and environment variable
dooz run api -p 8080:8080 -e NODE_ENV=production --dooz dry
```
