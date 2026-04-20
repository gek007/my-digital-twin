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

TF_VARS="-var=project_name=$PROJECT_NAME -var=environment=$ENVIRONMENT"
NAME="twin-$ENVIRONMENT"

# Import pre-existing resources into Terraform state (safe — errors are suppressed)
echo "Importing existing AWS resources into Terraform state..."

# S3 buckets and their configurations
terraform import $TF_VARS -input=false aws_s3_bucket.frontend                          "$NAME-frontend-$AWS_ACCOUNT_ID" 2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket_public_access_block.frontend      "$NAME-frontend-$AWS_ACCOUNT_ID" 2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket_website_configuration.frontend    "$NAME-frontend-$AWS_ACCOUNT_ID" 2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket_policy.frontend                   "$NAME-frontend-$AWS_ACCOUNT_ID" 2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket.memory                            "$NAME-memory-$AWS_ACCOUNT_ID"   2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket_public_access_block.memory        "$NAME-memory-$AWS_ACCOUNT_ID"   2>/dev/null || true
terraform import $TF_VARS -input=false aws_s3_bucket_ownership_controls.memory         "$NAME-memory-$AWS_ACCOUNT_ID"   2>/dev/null || true

# IAM role and policy attachments
terraform import $TF_VARS -input=false aws_iam_role.lambda_role                        "$NAME-lambda-role"              2>/dev/null || true
terraform import $TF_VARS -input=false aws_iam_role_policy_attachment.lambda_basic     "$NAME-lambda-role/arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true
terraform import $TF_VARS -input=false aws_iam_role_policy_attachment.lambda_bedrock   "$NAME-lambda-role/arn:aws:iam::aws:policy/AmazonBedrockFullAccess"                  2>/dev/null || true
terraform import $TF_VARS -input=false aws_iam_role_policy_attachment.lambda_s3        "$NAME-lambda-role/arn:aws:iam::aws:policy/AmazonS3FullAccess"                       2>/dev/null || true

# Lambda function
terraform import $TF_VARS -input=false aws_lambda_function.api                         "$NAME-api"                      2>/dev/null || true

# Lambda permission
terraform import $TF_VARS -input=false aws_lambda_permission.api_gw                    "$NAME-api/AllowExecutionFromAPIGateway" 2>/dev/null || true

# API Gateway — look up ID dynamically then import dependent resources
API_GW_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='$NAME-api-gateway'].ApiId | [0]" \
  --output text 2>/dev/null || true)

if [ -n "$API_GW_ID" ] && [ "$API_GW_ID" != "None" ]; then
  terraform import $TF_VARS -input=false aws_apigatewayv2_api.main        "$API_GW_ID"              2>/dev/null || true
  terraform import $TF_VARS -input=false aws_apigatewayv2_stage.default   "$API_GW_ID/\$default"    2>/dev/null || true

  INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_GW_ID" \
    --query "Items[0].IntegrationId" --output text 2>/dev/null || true)
  [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "None" ] && \
    terraform import $TF_VARS -input=false aws_apigatewayv2_integration.lambda "$API_GW_ID/$INTEGRATION_ID" 2>/dev/null || true

  while IFS=$'\t' read -r ROUTE_ID ROUTE_KEY; do
    case "$ROUTE_KEY" in
      "GET /")       terraform import $TF_VARS -input=false aws_apigatewayv2_route.get_root  "$API_GW_ID/$ROUTE_ID" 2>/dev/null || true ;;
      "POST /chat")  terraform import $TF_VARS -input=false aws_apigatewayv2_route.post_chat "$API_GW_ID/$ROUTE_ID" 2>/dev/null || true ;;
      "GET /health") terraform import $TF_VARS -input=false aws_apigatewayv2_route.get_health "$API_GW_ID/$ROUTE_ID" 2>/dev/null || true ;;
    esac
  done < <(aws apigatewayv2 get-routes --api-id "$API_GW_ID" \
    --query "Items[*].[RouteId,RouteKey]" --output text 2>/dev/null || true)
fi

# CloudFront distribution — look up by S3 origin
CF_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?contains(DomainName,'$NAME-frontend-$AWS_ACCOUNT_ID')]].Id | [0]" \
  --output text 2>/dev/null || true)
[ -n "$CF_DIST_ID" ] && [ "$CF_DIST_ID" != "None" ] && \
  terraform import $TF_VARS -input=false aws_cloudfront_distribution.main "$CF_DIST_ID" 2>/dev/null || true

if [ "$ENVIRONMENT" = "prod" ]; then
  terraform apply -var-file="prod.tfvars" $TF_VARS -auto-approve
else
  terraform apply $TF_VARS -auto-approve
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
