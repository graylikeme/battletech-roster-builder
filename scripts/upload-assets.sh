#!/usr/bin/env bash
set -euo pipefail

# Uploads record-sheet assets to the S3 bucket under the roster/ prefix.
# Reads S3 credentials from .env file in the repo root.
#
# Required .env variables:
#   S3_HOSTNAME    — S3-compatible endpoint (without https://)
#   S3_ACCESS_KEY  — S3 access key
#   S3_SECRET_KEY  — S3 secret key
#   S3_BUCKET_NAME — full bucket name (includes provider prefix)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$REPO_ROOT/packages/record-sheet/assets"

if [ ! -d "$ASSETS_DIR/patterns" ]; then
  echo "Error: $ASSETS_DIR/patterns not found." >&2
  exit 1
fi

# Load .env
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

: "${S3_HOSTNAME:?S3_HOSTNAME not set — check .env}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY not set — check .env}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY not set — check .env}"
: "${S3_BUCKET_NAME:?S3_BUCKET_NAME not set — check .env}"

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"

ENDPOINT="https://${S3_HOSTNAME}"

echo "Configuring CORS..."
aws s3api put-bucket-cors \
  --bucket "$S3_BUCKET_NAME" \
  --endpoint-url "$ENDPOINT" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["https://roster.battledroids.ru"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 86400
      }
    ]
  }'

echo "Uploading template images to roster/templates/..."
for f in RS_TW_BP.png RS_TW_QD.png Charts.png ChartsQD.png charts-minimal.png charts-minimalQD.png; do
  if [ -f "$ASSETS_DIR/$f" ]; then
    aws s3 cp "$ASSETS_DIR/$f" "s3://${S3_BUCKET_NAME}/roster/templates/$f" \
      --endpoint-url "$ENDPOINT" \
      --content-type "image/png"
  fi
done

echo "Syncing patterns to roster/patterns/..."
aws s3 sync "$ASSETS_DIR/patterns/" "s3://${S3_BUCKET_NAME}/roster/patterns/" \
  --endpoint-url "$ENDPOINT" \
  --content-type "image/png"

echo "Done. Files available at https://resources.battledroids.ru/roster/"
