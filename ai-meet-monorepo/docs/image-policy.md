Image tagging policy:
- Use registry/org/project:sha-<short> for CI artifacts (e.g. ghcr.io/myorg/meeting-service:sha-abcd1234)
- Use registry/org/project:branch for ephemeral branch deployments
- Maintain a cache tag: registry/org/project:cache used by buildx --cache-from/--cache-to
- Keep only last N images in the registry via registry lifecycle policy