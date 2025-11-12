# SECURITY.md

Responsible Disclosure

If you find a security issue, please report it to security@example.com. Include a detailed description, steps to reproduce, and any PoC code. We will respond within 3 business days.

Code Review Policy

- All changes must go through Pull Requests.
- At least one approval from a CODEOWNER or maintainer is required for `main` and `develop`.
- Sensitive changes (security, infra, dependencies) require two approvals.

CI/CD Gate Rules

- CI must pass (lint, typecheck, build, tests) for PR to be mergeable.
- Code scanning (CodeQL) and dependency scanning must pass or be acknowledged with rationale.

Dependency and Secret Handling

- Do not commit secrets. Use GitHub Secrets for workflows and .env in local development with `.env.example` committed.
- Rotate credentials immediately after any suspected compromise.

Contact

security@example.com
