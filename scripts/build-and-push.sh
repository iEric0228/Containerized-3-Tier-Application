#!/bin/bash
# Build and Push Docker Images to ECR
# This script builds and pushes Docker images to AWS ECR
# All values are dynamically discovered - no hardcoded ARNs
# Usage: ./scripts/build-and-push.sh [--tag TAG] [--skip-build] [--force-deploy]

set -e

# Parse arguments
IMAGE_TAG="${IMAGE_TAG:-latest}"
SKIP_BUILD=false
FORCE_DEPLOY=false
ENV_PREFIX="${ENV_PREFIX:-dev}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --force-deploy)
            FORCE_DEPLOY=true
            shift
            ;;
        --env)
            ENV_PREFIX="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🚀 Build and Push Docker Images"
echo "================================"

# Get AWS configuration dynamically
export AWS_REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Error: Could not get AWS Account ID. Check your AWS credentials."
    exit 1
fi

ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FRONTEND_REPO="${ECR_REGISTRY}/${ENV_PREFIX}-frontend"
BACKEND_REPO="${ECR_REGISTRY}/${ENV_PREFIX}-backend"

echo "📋 Configuration:"
echo "   AWS Region: $AWS_REGION"
echo "   AWS Account: $ACCOUNT_ID"
echo "   ECR Registry: $ECR_REGISTRY"
echo "   Image Tag: $IMAGE_TAG"
echo "   Environment: $ENV_PREFIX"
echo ""

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
echo "✅ ECR login successful"
echo ""

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ "$SKIP_BUILD" = false ]; then
    echo "🏗️  Building Docker images..."
    echo ""
    
    # Build frontend
    echo "📦 Building frontend image..."
    docker build \
        --platform linux/amd64 \
        -t "${FRONTEND_REPO}:${IMAGE_TAG}" \
        -t "${FRONTEND_REPO}:latest" \
        "${PROJECT_ROOT}/frontend"
    echo "✅ Frontend image built"
    echo ""
    
    # Build backend
    echo "📦 Building backend image..."
    docker build \
        --platform linux/amd64 \
        -t "${BACKEND_REPO}:${IMAGE_TAG}" \
        -t "${BACKEND_REPO}:latest" \
        "${PROJECT_ROOT}/backend"
    echo "✅ Backend image built"
    echo ""
fi

# Push images
echo "📤 Pushing images to ECR..."
echo ""

echo "📤 Pushing frontend image..."
docker push "${FRONTEND_REPO}:${IMAGE_TAG}"
docker push "${FRONTEND_REPO}:latest"
echo "✅ Frontend image pushed"
echo ""

echo "📤 Pushing backend image..."
docker push "${BACKEND_REPO}:${IMAGE_TAG}"
docker push "${BACKEND_REPO}:latest"
echo "✅ Backend image pushed"
echo ""

# Force ECS deployment if requested
if [ "$FORCE_DEPLOY" = true ]; then
    echo "🔄 Forcing ECS service deployment..."
    
    CLUSTER_NAME="${ENV_PREFIX}"
    
    # Check if services exist and update them
    FRONTEND_SERVICE=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "${ENV_PREFIX}-frontend" --query 'services[0].serviceName' --output text 2>/dev/null || echo "")
    BACKEND_SERVICE=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "${ENV_PREFIX}-backend" --query 'services[0].serviceName' --output text 2>/dev/null || echo "")
    
    if [ -n "$FRONTEND_SERVICE" ] && [ "$FRONTEND_SERVICE" != "None" ]; then
        echo "   Updating frontend service..."
        aws ecs update-service --cluster "$CLUSTER_NAME" --service "${ENV_PREFIX}-frontend" --force-new-deployment --no-cli-pager > /dev/null
        echo "   ✅ Frontend service updated"
    else
        echo "   ⚠️  Frontend service not found, skipping"
    fi
    
    if [ -n "$BACKEND_SERVICE" ] && [ "$BACKEND_SERVICE" != "None" ]; then
        echo "   Updating backend service..."
        aws ecs update-service --cluster "$CLUSTER_NAME" --service "${ENV_PREFIX}-backend" --force-new-deployment --no-cli-pager > /dev/null
        echo "   ✅ Backend service updated"
    else
        echo "   ⚠️  Backend service not found, skipping"
    fi
    echo ""
fi

echo "================================"
echo "✅ Build and Push Complete!"
echo "================================"
echo ""
echo "📦 Images:"
echo "   Frontend: ${FRONTEND_REPO}:${IMAGE_TAG}"
echo "   Backend: ${BACKEND_REPO}:${IMAGE_TAG}"
echo ""

if [ "$FORCE_DEPLOY" = false ]; then
    echo "💡 To deploy to ECS, run with --force-deploy flag"
    echo "   ./scripts/build-and-push.sh --force-deploy"
fi
