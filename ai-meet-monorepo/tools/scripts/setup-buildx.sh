set -euo pipefail
# Create a docker buildx builder with persistent cache
docker buildx create --use --name aimeet-builder || docker buildx use aimeet-builder
docker buildx inspect --bootstrap
echo "Buildx builder ready as 'aimeet-builder'"

