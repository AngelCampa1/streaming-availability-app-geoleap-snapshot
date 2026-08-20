# User Story US-1.6: CI/CD Pipeline Setup

**Epic:** Foundation & Infrastructure Setup  
**Priority:** P0 (Must-Have)  
**Story Points:** 10  
**Sprint:** 1-2  

## User Story
**As a** developer  
**I want** automated build and deployment pipelines  
**So that** code changes can be deployed efficiently and reliably to all environments

## Acceptance Criteria
- [ ] GitHub Actions workflows are set up for automated builds and tests
- [ ] Separate pipelines for frontend (Next.js) and backend (.NET 9)
- [ ] Automated testing runs on every pull request with status checks
- [ ] Staging deployments happen automatically on main branch commits
- [ ] Production deployments require manual approval with proper gates
- [ ] Rollback mechanism is implemented and tested
- [ ] Environment-specific configurations are managed securely
- [ ] Build artifacts are properly versioned and stored

## Definition of Done
- [ ] Pull requests cannot be merged without passing CI checks
- [ ] Staging environment automatically receives latest changes from main
- [ ] Production deployments are gated with approval workflows
- [ ] Rollback can be executed within 5 minutes
- [ ] All environment variables and secrets are managed securely
- [ ] Build status is visible to all team members
- [ ] Deployment history and artifacts are tracked
- [ ] Pipeline failures are automatically reported to team

## Technical Requirements

### GitHub Actions Workflows
- **Backend CI/CD** (.NET 9 build, test, deploy)
- **Frontend CI/CD** (Next.js build, test, deploy)
- **Infrastructure** (Bicep template validation and deployment)
- **Database migrations** (automated with rollback capability)
- **Security scanning** (dependency vulnerabilities, code analysis)

### Deployment Strategy
- **Pull Request:** Build + Test + Security scan
- **Staging:** Auto-deploy from main branch after PR merge
- **Production:** Manual approval required, blue-green deployment
- **Rollback:** One-click rollback to previous stable version

## Implementation Tasks

### GitHub Actions Setup
- [ ] Create `.github/workflows/` directory structure
- [ ] Set up backend CI workflow (.NET build, test, publish)
- [ ] Set up frontend CI workflow (Next.js build, test, static analysis)
- [ ] Create infrastructure deployment workflow (Bicep validation)
- [ ] Configure database migration workflow with Entity Framework
- [ ] Set up dependency security scanning with GitHub Security
- [ ] Create workflow for Docker image builds (if containerizing)
- [ ] Set up workflow dispatch for manual deployments

### Environment Management
- [ ] Configure GitHub Secrets for Azure credentials and API keys
- [ ] Set up environment-specific GitHub Environments with protection rules
- [ ] Create deployment approval workflows for production
- [ ] Configure environment variables for each deployment target
- [ ] Set up secret rotation workflows where applicable
- [ ] Implement environment-specific configuration management
- [ ] Create environment health check workflows

### Build and Test Automation
```yaml
# Example backend workflow structure
name: Backend CI/CD
on:
  pull_request:
    paths: ['src/backend/**']
  push:
    branches: [main]
    paths: ['src/backend/**']

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET 9
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - name: Restore dependencies
        run: dotnet restore
      - name: Build
        run: dotnet build --no-restore
      - name: Test
        run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage"
      - name: Security scan
        run: dotnet list package --vulnerable --include-transitive
```

### Deployment Workflows
- [ ] Azure App Service deployment with deployment slots
- [ ] Database migration deployment with rollback scripts
- [ ] Static asset deployment to Azure CDN
- [ ] Environment-specific configuration deployment
- [ ] Health check verification after deployment
- [ ] Automated smoke tests post-deployment
- [ ] Notification system for deployment status
- [ ] Integration with Azure Application Insights for deployment tracking

### Quality Gates and Approvals
- [ ] Code coverage thresholds (80% minimum)
- [ ] Security vulnerability scanning (no high/critical vulnerabilities)
- [ ] Performance regression testing
- [ ] Manual approval for production deployments
- [ ] Automated rollback triggers for failed health checks
- [ ] Deployment window restrictions for production
- [ ] Change approval integration with project management tools

## Deployment Environments

### Development Environment
- **Trigger:** Every commit to feature branches
- **Gates:** Build + unit tests must pass
- **Approval:** None required
- **Rollback:** Not applicable (ephemeral environment)

### Staging Environment
- **Trigger:** Merge to main branch
- **Gates:** All CI checks + integration tests + security scan
- **Approval:** None required (auto-deploy)
- **Rollback:** Automated on health check failure

### Production Environment
- **Trigger:** Manual workflow dispatch or scheduled release
- **Gates:** All staging tests + manual approval
- **Approval:** Required from designated approvers
- **Rollback:** Manual trigger with automated execution

## Security and Compliance
- [ ] All secrets stored in GitHub Secrets, never in code
- [ ] OIDC authentication with Azure (no long-lived secrets)
- [ ] Audit logging for all deployment activities
- [ ] Code signing for release artifacts
- [ ] Dependency vulnerability scanning and alerts
- [ ] Infrastructure as Code security validation
- [ ] Compliance checks for regulatory requirements
- [ ] Secure handling of database connection strings and API keys

## Monitoring and Observability
- [ ] Deployment success/failure metrics tracking
- [ ] Build time and performance monitoring
- [ ] Automated notification system (Slack, Teams, email)
- [ ] Integration with Azure Application Insights for deployment correlation
- [ ] Dashboard showing deployment status across all environments
- [ ] Historical deployment data for analysis and improvement
- [ ] Alert system for pipeline failures and long-running builds

## Rollback Strategy
```yaml
# Rollback workflow example
name: Production Rollback
on:
  workflow_dispatch:
    inputs:
      target_version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Rollback App Service
        run: az webapp deployment slot swap --slot staging --name ${{ env.APP_NAME }}
      - name: Verify Health
        run: curl -f ${{ env.HEALTH_CHECK_URL }}
      - name: Notify Team
        run: # Send notification of rollback completion
```

## Performance Optimization
- [ ] Parallel job execution where possible
- [ ] Caching of dependencies and build artifacts
- [ ] Incremental builds to reduce build times
- [ ] Matrix builds for different environments
- [ ] Optimization of Docker layer caching
- [ ] Use of GitHub Actions cache for node_modules and NuGet packages
- [ ] Build artifact reuse across deployment stages

## Dependencies
- Azure infrastructure must be provisioned (US-1.5)
- GitHub repository with proper branch protection rules
- Azure service principal with deployment permissions
- Development environment setup completed (US-1.1)

## Risks
- **Pipeline complexity:** Keep workflows simple and modular
- **Secret management:** Use OIDC and short-lived tokens where possible
- **Deployment failures:** Comprehensive testing and rollback procedures
- **Performance impact:** Optimize build times and resource usage

## Testing Strategy
- [ ] Test all workflows in development environment first
- [ ] Verify rollback procedures work correctly
- [ ] Test approval workflows and notification systems
- [ ] Validate secret management and security scanning
- [ ] Performance test build and deployment times
- [ ] Test failure scenarios and error handling
- [ ] Verify integration with monitoring systems

## Success Metrics
- **Build success rate:** > 95% of builds pass without intervention
- **Deployment frequency:** Multiple deployments per day to staging
- **Lead time:** < 30 minutes from commit to staging deployment
- **Mean time to recovery:** < 5 minutes for rollbacks
- **Pipeline reliability:** < 1% false positive test failures

## Resources
- GitHub Actions Documentation: https://docs.github.com/en/actions
- Azure DevOps Integration: https://docs.microsoft.com/en-us/azure/devops/
- .NET CI/CD Best Practices: https://docs.microsoft.com/en-us/dotnet/devops/

## Estimation Notes
- 10 story points due to complexity of multi-service pipeline coordination
- Includes comprehensive testing and security configuration
- Investment in robust CI/CD prevents future deployment issues and enables rapid iteration