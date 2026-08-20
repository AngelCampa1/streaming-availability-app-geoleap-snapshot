# GeoLeap Production Deployment Guide

**Last Updated:** May 25, 2026

## Production Environment

| Component | Value |
|-----------|-------|
| **Frontend URL** | https://geoleap.app |
| **Backend API URL** | https://api.geoleap.app |
| **Backend Deployments** | Automatic production deployment from `origin/main` |
| **Database** | PostgreSQL |
| **Cache** | Redis |

## Deployment Process

Production deploys are triggered automatically when `origin/main` changes. The old Azure VM SSH/docker-compose process is retired; do not SSH to a VM, run server-side `git pull`, copy secrets with `scp`, or rebuild compose services manually.

1. Merge reviewed changes into `main`.
2. Push `main` to GitHub.
3. Watch the newest GitHub deployment status:

```bash
gh api repos/AngelCampa1/geoleap/deployments --jq '.[0] | {sha, environment, created_at, statuses_url}'
gh api repos/AngelCampa1/geoleap/commits/HEAD/status --jq '{state, statuses: [.statuses[] | {context,state,target_url,description,updated_at}]}'
```

4. Verify production health:

```bash
curl https://api.geoleap.app/health/live
curl https://api.geoleap.app/health/ready
curl -I https://geoleap.app/
```

## Backend Deploy Details

The backend includes [backend/railway.toml](../../backend/railway.toml), which configures Railway to build from the backend Dockerfile and use `/health/live` as the deploy health check.

Database migrations run during backend startup in non-testing environments unless `SKIP_DB_MIGRATIONS=true` is set. Production must not skip migrations unless the service has an explicit external migration workflow and the required safety indexes already exist.

## Required Production Secrets

Production configuration must provide the runtime secrets through the deployment platform, not committed files:

- `ConnectionStrings__DefaultConnection`
- `ConnectionStrings__Redis`
- `JWT__Secret`
- `Stripe__SecretKey`
- `Stripe__PublishableKey`
- `Stripe__WebhookSecret`
- `Apple__SharedSecret`
- `Google__PlayStore__ServiceAccountJson`

Frontend deploys must provide build-time public values through the current frontend deployment platform:

- `NEXT_PUBLIC_API_URL=https://api.geoleap.app`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Health Checks

```bash
curl https://api.geoleap.app/health/live
curl https://api.geoleap.app/health/ready
curl https://api.geoleap.app/health
```

- `/health/live` proves the process is running.
- `/health/ready` verifies production dependencies such as database and Redis.
- `/health` returns the full health report.
