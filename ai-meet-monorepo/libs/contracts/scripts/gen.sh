set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT_DIR="$ROOT_DIR/generated"
mkdir -p "$OUT_DIR"/{ts,go,py,openapi}
echo "Generating protobuf bindings..."

# Ensure protoc exists
if ! command -v protoc >/dev/null 2>&1; then
  echo "protoc not found. Please install protoc (https://grpc.io/docs/protoc-installation/)"
  exit 1
fi

# Generate Go
protoc -I "$ROOT_DIR/protos" \
  --go_out="$OUT_DIR/go" \
  --go_opt=paths=source_relative \
  "$ROOT_DIR/protos"/*.proto

# Generate Python
protoc -I "$ROOT_DIR/protos" \
  --python_out="$OUT_DIR/py" \
  "$ROOT_DIR/protos"/*.proto

# Generate TypeScript using ts-proto if available
if command -v protoc-gen-ts >/dev/null 2>&1; then
  protoc -I "$ROOT_DIR/protos" \
    --plugin=protoc-gen-ts=$(which protoc-gen-ts) \
    --ts_out="$OUT_DIR/ts" \
    "$ROOT_DIR/protos"/*.proto || true
else
  echo "protoc-gen-ts not found; skipping TS proto generation. Install ts-proto or protoc-gen-ts."
fi

# Generate OpenAPI TS client using openapi-generator if available
if command -v openapi-generator-cli >/dev/null 2>&1; then
  openapi-generator-cli generate -i "$ROOT_DIR/openapi/api-v1.yaml" -g typescript-fetch -o "$OUT_DIR/openapi/ts" || true
else
  echo "openapi-generator-cli not found; skipping OpenAPI codegen."
fi

echo "Generated files in $OUT_DIR"