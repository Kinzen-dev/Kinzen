# Infrastructure

This directory contains all infrastructure-as-code (IaC) and deployment configurations for the Portfolio application.

## 📁 Directory Structure

```
infrastructure/
├── docker-compose.*.yml    # Docker Compose for different environments
├── nginx/                  # Nginx configurations
├── kubernetes/             # Kubernetes manifests
└── terraform/              # Terraform IaC for AWS
```

## 🐳 Docker Compose

### Local Development

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop services
docker-compose -f docker-compose.local.yml down
```

### Development Environment

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production Environment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## ☸️ Kubernetes

### Prerequisites

- Kubernetes cluster (EKS, GKE, or local with minikube)
- kubectl configured
- Docker images pushed to registry

### Deployment

1. **Create Namespace**

```bash
kubectl apply -f kubernetes/namespace.yml
```

2. **Create ConfigMap and Secrets**

```bash
# Update secrets.yml with your actual secrets
kubectl apply -f kubernetes/configmap.yml
kubectl apply -f kubernetes/secrets.yml
```

3. **Deploy Applications**

```bash
kubectl apply -f kubernetes/backend-deployment.yml
kubectl apply -f kubernetes/frontend-deployment.yml
```

4. **Create Ingress**

```bash
kubectl apply -f kubernetes/ingress.yml
```

5. **Verify Deployment**

```bash
kubectl get pods -n kinzen
kubectl get services -n kinzen
kubectl get ingress -n kinzen
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment kinzen-backend --replicas=5 -n kinzen

# Check HPA status
kubectl get hpa -n kinzen
```

### Monitoring

```bash
# View logs
kubectl logs -f deployment/kinzen-backend -n kinzen

# Describe pod
kubectl describe pod <pod-name> -n kinzen
```

## ☁️ Terraform (AWS)

### Prerequisites

- AWS CLI configured
- Terraform >= 1.0 installed
- S3 bucket for state backend

### Setup

1. **Initialize Terraform**

```bash
cd terraform
terraform init
```

2. **Create terraform.tfvars**

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

3. **Plan Infrastructure**

```bash
terraform plan
```

4. **Apply Infrastructure**

```bash
terraform apply
```

5. **Destroy Infrastructure** (when needed)

```bash
terraform destroy
```

### AWS Resources Created

- **VPC** with public/private subnets across 3 AZs
- **RDS PostgreSQL** (Multi-AZ in production)
- **ElastiCache Redis** (Cluster mode in production)
- **ECS Cluster** with Fargate
- **S3 Buckets** for assets and backups
- **CloudFront** CDN
- **ALB** for load balancing
- **Security Groups** and IAM roles

## 🔐 Secrets Management

### Development

Store secrets in `.env` files (gitignored)

### Kubernetes

Use Kubernetes Secrets or External Secrets Operator with AWS Secrets Manager:

```bash
kubectl create secret generic portfolio-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=jwt-secret='...' \
  -n portfolio
```

### AWS

Use AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name portfolio/production/database \
  --secret-string '{"username":"admin","password":"..."}'
```

## 📊 Monitoring & Logging

### Kubernetes

- Use Prometheus + Grafana for metrics
- Use ELK stack or Loki for logs
- Enable pod metrics:

```bash
kubectl top pods -n portfolio
```

### AWS

- CloudWatch Logs and Metrics
- AWS X-Ray for distributed tracing
- RDS Performance Insights

## 🔄 CI/CD

See `.github/workflows/` for GitHub Actions pipelines:

- `backend-ci.yml` - Backend build, test, deploy
- `frontend-ci.yml` - Frontend build, test, deploy

### Deployment Strategy

- **Development**: Auto-deploy on push to `develop`
- **Staging**: Auto-deploy on push to `develop` (after tests)
- **Production**: Auto-deploy on push to `main` (after approval)

## 🌍 Environments

| Environment     | Purpose                  | Infrastructure                |
| --------------- | ------------------------ | ----------------------------- |
| **Local**       | Development on localhost | Docker Compose                |
| **Development** | Shared dev environment   | Docker/Kubernetes             |
| **Staging**     | Pre-production testing   | Kubernetes/AWS                |
| **Production**  | Live environment         | Kubernetes/AWS (Multi-region) |

## 📈 Scaling Strategy

### Horizontal Scaling

- **Backend**: HPA based on CPU/Memory (3-10 replicas)
- **Frontend**: HPA based on CPU/Memory (3-10 replicas)
- **Database**: Read replicas for read-heavy workloads
- **Redis**: Cluster mode with sharding

### Vertical Scaling

Adjust resource requests/limits in deployment manifests

## 🔧 Troubleshooting

### Container Issues

```bash
# Check container logs
docker logs <container-name>

# Execute into container
docker exec -it <container-name> /bin/sh
```

### Kubernetes Issues

```bash
# Check pod status
kubectl get pods -n kinzen

# Describe pod
kubectl describe pod <pod-name> -n kinzen

# View logs
kubectl logs <pod-name> -n kinzen

# Check events
kubectl get events -n kinzen --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test connection from backend pod
kubectl exec -it <backend-pod> -n kinzen -- \
  psql $DATABASE_URL
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)

## 📄 License

MIT
