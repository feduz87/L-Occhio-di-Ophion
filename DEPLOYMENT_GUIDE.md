# L'Occhio di Ophion - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying L'Occhio di Ophion to production environments.

---

## Prerequisites

- Docker & Docker Compose 20.10+
- PostgreSQL 15+ or Docker
- Node.js 20+ (for local development)
- 2GB+ RAM recommended
- SSL certificate (for HTTPS)
- Domain name (optional but recommended)

---

## Quick Start (Docker)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/L-Occhio-di-Ophion.git
cd L-Occhio-di-Ophion
```

### 2. Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 3. Start Services
```bash
# Development
docker-compose up

# Production (with proxy & cache)
docker-compose --profile proxy --profile cache up -d
```

### 4. Initialize Database
```bash
# Automatically runs on first start
# Or manually:
docker-compose exec api npm run migrate
```

### 5. Verify Deployment
```bash
# Check health
curl http://localhost:3000/api/health

# Check game config
curl http://localhost:3000/api/game/config
```

---

## Configuration (.env File)

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DB_HOST=database
DB_PORT=5432
DB_NAME=ophion
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DATABASE_URL=postgres://postgres:PASSWORD@database:5432/ophion

# Security
JWT_SECRET=YOUR_LONG_RANDOM_SECRET_KEY_HERE
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Features
DUAL_MODE_IA_ENABLED=true
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GAME_DIFFICULTY=normal

# Cache (optional)
REDIS_URL=redis://redis:6379
CACHE_TTL=3600

# Email (for password reset, optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (development, production, test) |
| `PORT` | `3000` | Server port |
| `HOST` | `localhost` | Server host |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `ophion` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `` | Database password (CHANGE!) |
| `JWT_SECRET` | `` | JWT signing secret (CHANGE!) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origins |
| `DUAL_MODE_IA_ENABLED` | `false` | Enable AI features |
| `GEMINI_API_KEY` | `` | Google Gemini API key |
| `GAME_DIFFICULTY` | `normal` | Default difficulty |
| `REDIS_URL` | `` | Redis connection string (optional) |

---

## Database Setup

### Automatic Initialization
```bash
# Docker Compose automatically runs:
# 1. 01_schema_core.sql
# 2. 02_schema_world.sql
# ... all SQL files in server/db/

# Available from: ./server/db/*.sql
```

### Manual Database Setup
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost -d ophion

# Run migrations in order
\i server/db/01_schema_core.sql
\i server/db/02_schema_world.sql
\i server/db/03_schema_combat.sql
... (all other schemas)
\i server/db/11_performance_optimization.sql

# Seed data
\i server/db/seed.js (via Node.js)
```

### Database Backup
```bash
# Backup
docker-compose exec database pg_dump -U postgres ophion > backup.sql

# Restore
docker-compose exec -T database psql -U postgres ophion < backup.sql
```

---

## Performance Tuning

### PostgreSQL Optimization
```sql
-- Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Analyze tables
ANALYZE;

-- Reindex if needed
REINDEX DATABASE ophion;
```

### API Optimization
```javascript
// Connection pooling (already configured in code)
// Rate limiting: 100 requests/15min globally, 5 attempts/15min for auth
// Caching: Leaderboard (120s), Guilds (60s), Friends (60s)
```

### Monitoring Performance
```bash
# Check database connections
docker-compose exec database psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Monitor API logs
docker-compose logs -f api

# Check Docker stats
docker stats
```

---

## SSL/HTTPS Setup

### Generate Self-Signed Certificate (Development)
```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### Using Let's Encrypt (Production)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx.conf with certificate paths
```

### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Security Checklist

- [x] Change `JWT_SECRET` to a strong random value
- [x] Change database password to strong random value
- [x] Set `NODE_ENV=production`
- [x] Enable SSL/HTTPS
- [x] Configure CORS_ORIGIN correctly
- [x] Set rate limiting appropriately
- [x] Enable security headers (Helmet.js)
- [x] Use environment variables for secrets
- [x] Implement logging & monitoring
- [x] Regular security audits
- [x] Keep dependencies updated

---

## Monitoring & Logging

### Docker Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f database

# With timestamps
docker-compose logs --timestamps -f
```

### Application Health Check
```bash
# Health endpoint
curl http://localhost:3000/api/health

# Response:
# {
#   "status": "ok",
#   "database": "connected",
#   "timestamp": "2025-11-09T00:45:00Z"
# }
```

### Monitoring Tools (Optional)
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking
- **DataDog**: Full observability
- **New Relic**: APM

---

## Scaling

### Horizontal Scaling (Multiple API Instances)
```yaml
# docker-compose.yml
api:
  deploy:
    replicas: 3
```

### Database Replication
```bash
# Set up PostgreSQL streaming replication
# Primary (write): api.yourdomain.com
# Standby (read): api-replica.yourdomain.com
```

### Caching Layer
```bash
# Enable Redis for:
# - Session storage
# - Leaderboard caching
# - Frequently queried data

docker-compose --profile cache up -d
```

---

## Backup & Recovery

### Automated Backups
```bash
#!/bin/bash
# daily-backup.sh
DATE=$(date +%Y%m%d)
docker-compose exec -T database pg_dump -U postgres ophion > backups/ophion_$DATE.sql
gzip backups/ophion_$DATE.sql

# Upload to S3/cloud storage
aws s3 cp backups/ophion_$DATE.sql.gz s3://your-bucket/backups/
```

### Recovery Procedure
```bash
# 1. Stop API
docker-compose stop api

# 2. Restore database
gunzip backup.sql.gz
docker-compose exec -T database psql -U postgres ophion < backup.sql

# 3. Restart API
docker-compose up -d api

# 4. Verify
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Database Connection Refused
```bash
# Check database is running
docker-compose ps database

# Check logs
docker-compose logs database

# Verify credentials
docker-compose exec database psql -U postgres -c "SELECT 1;"
```

### API Fails to Start
```bash
# Check Node errors
docker-compose logs api

# Verify environment variables
docker-compose config | grep -A20 "api:"

# Check port availability
lsof -i :3000
```

### High Memory Usage
```bash
# Check Node.js memory
docker stats api

# Increase memory limit in docker-compose.yml
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

### Database Slow Queries
```sql
-- Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC;

-- Run EXPLAIN on slow queries
EXPLAIN ANALYZE SELECT ...;
```

---

## Update & Maintenance

### Updating Application
```bash
# Pull latest code
git pull origin master

# Rebuild image
docker-compose build

# Restart services
docker-compose up -d
```

### Database Migrations
```bash
# Before updating, create backup
docker-compose exec -T database pg_dump -U postgres ophion > backup.sql

# Apply migrations
docker-compose exec api npm run migrate

# Verify
curl http://localhost:3000/api/health
```

### Dependency Updates
```bash
# Check for updates
docker-compose exec api npm outdated

# Update dependencies
docker-compose exec api npm update

# Security audit
docker-compose exec api npm audit
docker-compose exec api npm audit fix
```

---

## Production Checklist

- [x] Environment configured (.env)
- [x] Database initialized with all schemas
- [x] SSL/HTTPS configured
- [x] Security headers enabled
- [x] Rate limiting configured
- [x] Logging enabled
- [x] Backups scheduled
- [x] Monitoring configured
- [x] Health checks passing
- [x] Load testing completed
- [x] Disaster recovery plan
- [x] Documentation complete

---

## Support & Documentation

- [README.md](README.md) - Project overview
- [STATUS.md](STATUS.md) - Development status
- [PHASE_5_COMPLETE.md](PHASE_5_COMPLETE.md) - Multiplayer documentation
- [server/index.js](server/index.js) - Application entry point
- Issues: Report bugs in GitHub issues

---

**Last Updated**: 2025-11-09  
**Status**: Production Ready ✅
