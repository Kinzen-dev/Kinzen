#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Deploying to $ENVIRONMENT..."
echo ""

case $ENVIRONMENT in
  staging)
    echo "Deploying to Staging environment..."
    kubectl config use-context staging
    kubectl apply -f infrastructure/kubernetes/ -n kinzen-staging
    ;;
  production)
    echo "Deploying to Production environment..."
    echo "⚠️  This will deploy to PRODUCTION!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Deployment cancelled."
      exit 1
    fi
    kubectl config use-context production
    kubectl apply -f infrastructure/kubernetes/ -n kinzen-production
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: ./deploy.sh [staging|production]"
    exit 1
    ;;
esac

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n kinzen-$ENVIRONMENT"
echo "  kubectl get services -n kinzen-$ENVIRONMENT"
echo ""

