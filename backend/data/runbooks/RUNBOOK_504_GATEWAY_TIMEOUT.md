# SOP: 504 Gateway Timeout Triage and Mitigation

## Metadata
- **Incident Category**: Ingress / API Gateway / Upstream Service Saturation
- **Default Severity**: P1 (if checkout/auth impacted) / P2 (non-critical routes)
- **Applicable Services**: Ingress Nginx, Cloudflare, Node.js API, FastAPI, Render Web Services
- **Tags**: `504`, `gateway-timeout`, `nginx`, `render`, `connection-pool`, `upstream`

---

## 1. Initial Assessment & Symptoms
A `504 Gateway Timeout` indicates that an edge reverse proxy (e.g. Cloudflare, AWS ALB, Nginx, or Render Ingress) waited for a response from the upstream application container longer than the configured timeout (typically 30s to 60s) and aborted the request.

### Common Symptoms:
- Spike in 504 HTTP status codes on edge metrics dashboard.
- Increased request queuing or connection resets on the application server.
- Increased latency on upstream downstream dependencies (e.g., PostgreSQL or Redis).
- Sudden spike in client retries compounding the load.

---

## 2. Immediate Diagnostic Tree

```
504 Spike Detected
    │
    ├── Step 2.1: Is the upstream container running out of CPU/Memory?
    │       ├── YES ──> Check Render / Pod metrics for OOM Kill or 100% CPU.
    │       │            Action: Temporarily scale replicas or bump memory limit.
    │       └── NO  ──> Proceed to Step 2.2
    │
    ├── Step 2.2: Are database connections saturated?
    │       ├── YES ──> Check active connections vs. max_connections / pool limit.
    │       │            Action: Check long-running queries (> 10s) and terminate blocking locks.
    │       └── NO  ──> Proceed to Step 2.3
    │
    └── Step 2.3: Is an external third-party API or downstream dependency hanging?
            ├── YES ──> Look for missing timeout settings on outbound HTTP/gRPC clients.
            └── NO  ──> Review recent code deploys or migration tasks.
```

---

## 3. Investigation Commands & Queries

### A. Check Upstream Response & Latency in Logs
```bash
# Filter recent 504 logs from Render or container standard error
grep "504 Gateway Time-out" /var/log/nginx/error.log | tail -n 50

# Check HTTP upstream response times in Nginx access logs
awk '($9 ~ /504/)' /var/log/nginx/access.log | awk '{print $7, $11}' | sort | uniq -c | sort -nr
```

### B. Check Database Lock Contention & Slow Queries
Execute against PostgreSQL:
```sql
-- Identify queries running longer than 10 seconds holding connections open
SELECT pid, now() - query_start AS duration, query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle' AND (now() - query_start) > interval '10 seconds'
ORDER BY duration DESC;

-- Identify blocking locks causing cascading thread starvation
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM  pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 4. Immediate Mitigation Checklist

1. **Kill Blocking Transactions**:
   If an unindexed migration or rogue query is blocking web traffic:
   ```sql
   -- Cancel the query gracefully first
   SELECT pg_cancel_backend(<BLOCKING_PID>);
   
   -- Terminate immediately if query fails to cancel within 10s
   SELECT pg_terminate_backend(<BLOCKING_PID>);
   ```

2. **Enable Circuit Breaker / Degraded Mode**:
   - Temporarily disable heavy background sync or non-essential features (e.g., recommendation banners).
   - Rate limit non-critical endpoints using Cloudflare / WAF rules.

3. **Restart / Horizontal Pod Autoscaling**:
   - If event loop lag or thread pool deadlock is detected, perform a rolling restart:
   ```bash
   # Kubernetes rolling restart
   kubectl rollout restart deployment/api-server -n production
   ```

---

## 5. Prevention & Post-Incident Review
- Ensure every outbound HTTP and database connection enforces a strict client timeout (< 5000ms).
- Configure upstream connection pool keepalive and idle connection reaping.
- Add alerting for P99 latency exceeding 2500ms before edge gateway hits 30s timeout.
