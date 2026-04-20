#!/usr/bin/env bash
set -e

ENVIRONMENT="${1:-dev}"
PROJECT_NAME="${2:-twin}"

echo "Deploying $PROJECT_NAME to $ENVIRONMENT ..."

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Build Lambda package
cd "$ROOT/backend"
echo "Building Lambda package..."
uv run deploy.py
cd "$ROOT"

# 2. Terraform workspace & apply
cd "$ROOT/terraform"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${DEFAULT_AWS_REGION:-eu-west-1}"

terraform init -input=false \
  -backend-config="bucket=twin-terraform-state-$AWS_ACCOUNT_ID" \
  -backend-config="key=$ENVIRONMENT/terraform.tfstate" \
  -backend-config="region=$AWS_REGION" \
  -backend-config="dynamodb_table=twin-terraform-locks" \
  -backend-config="encrypt=true"

terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"

if [ "$ENVIRONMENT" = "prod" ]; then
  terraform apply -var-file="prod.tfvars" -var="project_name=$PROJECT_NAME" -var="environment=$ENVIRONMENT" -auto-approve
else
  terraform apply -var="project_name=$PROJECT_NAME" -var="environment=$ENVIRONMENT" -auto-approve
fi

TF_JSON=$(terraform output -json)

API_URL=$(echo "$TF_JSON"    | jq -r '.api_gateway_url.value')
FRONTEND_BUCKET=$(echo "$TF_JSON" | jq -r '.s3_frontend_bucket.value')
CF_URL=$(echo "$TF_JSON"     | jq -r '.cloudfront_url.value')
CUSTOM_URL=$(echo "$TF_JSON" | jq -r '.custom_domain_url.value // empty')

if [ -z "$FRONTEND_BUCKET" ]; then
  echo "ERROR: s3_frontend_bucket output is empty; cannot sync frontend." >&2
  exit 1
fi

# 3. Build + deploy frontend
cd "$ROOT/frontend"

echo "Setting API URL for production..."
printf "NEXT_PUBLIC_API_URL=%s\n" "$API_URL" > .env.production
mkdir -p public
printf '{"apiBase":"%s"}' "$API_URL" > public/api-config.json
export NEXT_PUBLIC_API_URL="$API_URL"

npm install
npm run build
aws s3 sync ./out "s3://$FRONTEND_BUCKET/" --delete

cd "$ROOT"

# 4. Final summary
echo "Deployment complete!"
echo "CloudFront URL : $CF_URL"
[ -n "$CUSTOM_URL" ] && echo "Custom domain  : $CUSTOM_URL"
echo "API Gateway    : $API_URL"
