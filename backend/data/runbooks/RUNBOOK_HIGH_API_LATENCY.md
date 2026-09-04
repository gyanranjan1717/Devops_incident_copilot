# SOP: High API Latency & P99 Degradation Triage

## Metadata
- **Incident Category**: Performance Degradation / Latency Spike
- **Default Severity**: P2 (Elevated P99 > 3000ms) / P1 (Cascading timeouts)
- **Applicable Services**: FastAPI, Express, Render Web Services, PostgreSQL, Redis
- **Tags**: `latency`, `p99`, `slow-query`, `connection-queue`, `fastapi`, `render`

---

## 1. Initial Assessment
High API latency typically stems from:
1. Unindexed database queries executed under peak traffic.
2. Synchronous blocking I/O calls inside async event loops (e.g. `time.sleep` instead of `asyncio.sleep`, or synchronous DB calls in FastAPI).
3. Thread pool or database connection pool exhaustion causing queries to wait in queue before execution.
4. Downstream microservice saturation or network partition.

---

## 2. Fast Diagnosis Workflow

### Step 1: Check Database Execution Time vs Connection Queue
Query PostgreSQL for slow queries currently running:
```sql
SELECT pid, 
       now() - xact_start AS xact_duration,
       now() - query_start AS query_duration,
       state,
       wait_event_type,
       wait_event,
       left(query, 120) AS query_sample
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_duration DESC
LIMIT 10;
```

### Step 2: Correlate App Server Event Loop Lag
In Node.js / Python FastAPI, check if CPU utilization is high without high network traffic, indicating CPU-bound regex evaluations or JSON serialization overhead on large arrays.

---

## 3. Remediation Actions

1. **Add Missing Indexes Concurrently**:
   ```sql
   -- Always create indexes CONCURRENTLY in production to avoid table locks!
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created 
   ON orders (user_id, created_at DESC);
   ```

2. **Increase Connection Pool Size or Enable PgBouncer**:
   - Check if pool size is too small for concurrent async workers:
   ```python
   # Increase pool size in database engine
   engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)
   ```

3. **Enable Redis Query Caching**:
   - Cache expensive read queries for 60-300 seconds to instantly reduce database pressure.
