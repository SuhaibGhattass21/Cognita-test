# AI-Meet Monorepo

An AI-driven, multi-tenant meeting platform implemented as a small microservices monorepo. It contains two main backend services — `meeting` and `transcripts` — built with NestJS and managed in an Nx monorepo using pnpm. The services use Prisma + PostgreSQL for persistence and Kafka for inter-service eventing. Local orchestration is provided via Docker Compose.

## Project overview

This repository implements a simple event-driven meeting platform with two cooperating services:

- `meeting` — API to create/manage meetings. Persists meetings in PostgreSQL and publishes `meeting.*` events to Kafka.
- `transcripts` — subscribes to meeting events (for example `meeting.created`) and creates transcript sessions / artifacts in its own Postgres DB.

Key technologies:

- Nx monorepo
- pnpm workspace
- NestJS (services)
- Prisma ORM
- PostgreSQL (per-service instances)
- Kafka (Confluent images in Docker Compose)
- Docker Compose for local dev orchestration

This repo is intended for local development and lightweight end-to-end testing. It is not a production deployment (no cloud infra or secrets management built in here).

## Folder structure (high level)

```
project-root/
┣ apps/
┃ ┣ meeting/           # Meeting service (NestJS + Prisma + tests)
┃ ┣ transcripts/       # Transcripts service (NestJS + Prisma + tests)
┣ libs/                # Shared libraries (kafka helpers, db modules, contracts)
┣ docker-compose.yml   # Local infra: Kafka, Zookeeper, Postgres, Redis, etc.
┣ nx.json
┣ pnpm-workspace.yaml
┗ README.md
```

Brief:

- `apps/meeting` — REST + WebSocket endpoints for meeting lifecycle; publishes events to Kafka; stores meeting data in `meeting_db`.
- `apps/transcripts` — subscribes to Kafka topics, processes meeting events, and creates transcript sessions in `transcripts_db`.
- `libs/` — shared code such as Kafka client wrappers, Prisma helpers, and generated protobufs/contracts.

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (we use pnpm workspace features)
- Docker Desktop with Compose support
- (Optional) pgAdmin for DB inspection

On Windows, the default shell in examples below is PowerShell.

## Installation (first time)

From the project root:

```powershell
corepack enable
pnpm install

# (optional) visualize the Nx workspace
pnpm nx graph
```

Generate Prisma clients for both services:

```powershell
pnpm dlx prisma generate --schema=apps/meeting/prisma/schema.prisma
pnpm dlx prisma generate --schema=apps/transcripts/prisma/schema.prisma
```

Note: the Docker build process also runs `prisma generate` during image creation — generating locally speeds up development iteration.

## Run each service independently (local dev)

You can run services locally (not in Docker) using Nx. Each service will attempt to connect to its configured Postgres and Kafka instances. If you want to run services locally against Docker infra, start Docker Compose first (see next section).

Start the Meeting service:

```powershell
pnpm nx serve meeting
```

Start the Transcripts service:

```powershell
pnpm nx serve transcripts
```

Verify logs show successful DB and Kafka connections (look for `[Prisma]`, `[DatabaseService] Connected` and a Kafka connection log from the Kafka client wrapper).

## Run the full project in Docker (recommended for integration)

This repo includes `docker-compose.yml` which starts the infra needed for development: Kafka + Zookeeper, Postgres instances for each service, Redis, Kafka UI and pgAdmin.

Build and start everything:

```powershell
docker compose build
docker compose up -d
```

Services included (key ones):

- `meeting` (app)
- `transcripts` (app)
- `kafka` + `zookeeper`
- `postgres_meeting` (meeting DB)
- `postgres_transcripts` (transcripts DB)
- `kafka-ui` (UI at http://localhost:8085)
- `pgadmin` (optional DB UI)

Check running containers and logs:

```powershell
docker ps
docker compose logs -f meeting
docker compose logs -f transcripts
```

If Kafka fails to start due to stale Zookeeper state (NodeExistsException), you can stop the stack and remove only the Kafka/ZK volumes (this deletes topics/offsets):

```powershell
docker compose down
docker volume rm ai-meet-monorepo_kafka_data ai-meet-monorepo_zookeeper_data
docker compose up -d --build
```

Use this only in local dev — it will wipe topics and offsets.

## Testing database connections

pgAdmin (if enabled) is available at `http://localhost:8081` (or see your compose mapping). Use the following credentials to inspect DBs:

- Host (inside Docker network): `postgres_meeting` or `postgres_transcripts`
- Port: `5432` (inside network)
- User: `postgres`
- Password: `postgres`
- Databases: `meeting_db` and `transcripts_db`

From host (migrate the DBs if needed):

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5433/meeting_db'
pnpm dlx prisma migrate deploy --schema=apps/meeting/prisma/schema.prisma

$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/transcripts_db'
pnpm dlx prisma migrate deploy --schema=apps/transcripts/prisma/schema.prisma
```

After migrations, you can either use Prisma client in a small script or call the HTTP endpoints to perform CRUD operations.

## 📡 Testing Kafka integration

By default the Compose stack maps Kafka to `localhost:9092` for host access and `kafka:29092` inside the Docker network. The services inside Docker use `kafka:29092` while local clients/tests use `localhost:9092`.

Produce a `meeting.created` event by creating a meeting using the Meeting service API (example curl):

```powershell
curl -X POST http://localhost:3001/api/v1/meetings \
  -H 'Content-Type: application/json' \
  -d '{"id":"test-1","title":"Test Meeting","tenantId":"dev","startTime":"2025-11-06T10:00:00Z"}'
```

Confirm the Transcripts service receives the event and creates a transcript session (watch `docker compose logs -f transcripts` or request the transcripts API).

You can also inspect messages using Kafka UI at `http://localhost:8085`.

## End-to-end validation

To validate the full flow:

1. Start Docker Compose (see earlier).
2. Create a meeting via the Meeting API.
3. Verify the Meeting DB contains the meeting.
4. Verify the Transcripts DB has a new transcript session created from the event.
5. Confirm logs show:

```
[Kafka] Connected
[Prisma] Database connected
[Nest] Application started successfully
```

The repo includes convenience scripts for end-to-end smoke tests (for example `e2e-kafka-test.js` and `test-full-integration.js`) — run them from the project root if you want automated verification.

## Common troubleshooting

- If Kafka fails to connect:
  - Check `KAFKA_BROKERS` env value in `.env` or compose (should be `kafka:29092` for containers, `localhost:9092` for host tests).
  - Make sure Zookeeper is healthy before Kafka starts (compose depends_on uses healthchecks).
  - If a stale `/brokers/ids` node exists in ZooKeeper, either remove the specific ZK node using `zkCli` or remove the `kafka` and `zookeeper` volumes (dev only).

- If Prisma migrations fail:
  - Confirm you used the correct schema path.
  - Re-run `pnpm dlx prisma generate` and then `pnpm dlx prisma migrate deploy`.

- If Docker Compose is slow or times out: increase healthcheck start_period or use manual `docker compose up -d --build` and watch logs.

## Useful commands

```powershell
pnpm dlx prisma studio --schema=apps/meeting/prisma/schema.prisma   # DB GUI
pnpm nx test meeting                                             # run meeting tests
pnpm nx test transcripts                                         # run transcripts tests
pnpm nx affected:build --all                                     # build all projects
docker compose logs -f meeting                                   # stream meeting logs
docker compose down -v                                           # tear down and remove volumes
```

## Future enhancements

- Add CI/CD (GitHub Actions) to run lint, tests, and integration smoke tests on PRs.
- Add observability: metrics (Prometheus), traces (OpenTelemetry), and logs aggregation.
- Harden Kafka infra for local development (RBAC, TLS) and add idempotency & retries for producers/consumers.

---

## Current status (short)

- Meeting and Transcripts microservices: working (local + Docker)
- PostgreSQL + Prisma: integrated and migrations runnable
- Kafka communication: verified end-to-end for meeting -> transcripts
- Docker network & healthchecks: working for local dev

If you want, I can open a small PR that adds these docs to the repository and commits the test fixes referenced in `FIXLOG.md`.

---

## Contact / Maintainers

If you have questions about the repo structure or need help running anything locally, open an issue or ping the repo maintainer.

