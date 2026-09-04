# SOP: PostgreSQL Lock Contention and Blocking Query Triage

## Metadata
- **Incident Category**: Database Performance & Deadlocks
- **Default Severity**: P1 (if production web app transactions blocked) / P2
- **Applicable Services**: PostgreSQL, Neon DB, Supabase, PgBouncer, SQLAlchemy, Prisma
- **Tags**: `postgres`, `database`, `locks`, `pg_stat_activity`, `pg_locks`, `deadlock`, `pool-exhaustion`

---

## 1. Incident Overview
PostgreSQL lock contention occurs when an exclusive lock (e.g. `AccessExclusiveLock` from a table migration, or row-level `RowExclusiveLock` from an uncommitted `UPDATE`) blocks subsequent queries from acquiring shared locks. This cascades quickly into connection pool starvation, causing API timeouts and HTTP 500/504 errors.

---

## 2. Emergency Telemetry Queries

### Step 1: Detect Blocked PIDs and Root Blocker
Run this diagnostic query immediately to identify the culprit process holding the lock:
```sql
SELECT
    COALESCE(blockingl.relation::regclass::text, blockingl.locktype) as locked_item,
    now() - blockeda.query_start AS waiting_duration,
    blockeda.pid AS blocked_pid,
    blockeda.usename AS blocked_user,
    blockeda.query AS blocked_query,
    blockinga.pid AS blocking_pid,
    blockinga.usename AS blocking_user,
    blockinga.state AS blocking_state,
    now() - blockinga.query_start AS running_duration,
    blockinga.query AS blocking_query
FROM pg_catalog.pg_locks blockedl
JOIN pg_stat_activity blockeda ON blockeda.pid = blockedl.pid
JOIN pg_catalog.pg_locks blockingl ON(
    blockingl.locktype = blockedl.locktype
    AND blockingl.database IS NOT DISTINCT FROM blockedl.database
    AND blockingl.relation IS NOT DISTINCT FROM blockedl.relation
    AND blockingl.page IS NOT DISTINCT FROM blockedl.page
    AND blockingl.tuple IS NOT DISTINCT FROM blockedl.tuple
    AND blockingl.virtualxid IS NOT DISTINCT FROM blockedl.virtualxid
    AND blockingl.transactionid IS NOT DISTINCT FROM blockedl.transactionid
    AND blockingl.classid IS NOT DISTINCT FROM blockedl.classid
    AND blockingl.objid IS NOT DISTINCT FROM blockedl.objid
    AND blockingl.objsubid IS NOT DISTINCT FROM blockedl.objsubid
    AND blockingl.pid != blockedl.pid
)
JOIN pg_stat_activity blockinga ON blockinga.pid = blockingl.pid
WHERE NOT blockedl.granted;
```

### Step 2: Check "Idle in Transaction" Backends
Clients that open a transaction with `BEGIN` and fail to `COMMIT` or `ROLLBACK` due to unhandled exceptions or client dropouts hold row locks indefinitely:
```sql
SELECT pid, usename, client_addr, now() - state_change as idle_duration, query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND (now() - state_change) > interval '1 minute'
ORDER BY idle_duration DESC;
```

### Step 3: Check Active Connection Pool Saturation
```sql
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active_connections,
       count(*) FILTER (WHERE state = 'idle') as idle_connections,
       count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_tx,
       current_setting('max_connections')::int as max_connections
FROM pg_stat_activity;
```

---

## 3. Immediate Remediation Playbook

### Action 1: Terminate the Root Blocking PID
Once you identify the root `blocking_pid` holding up the queue:
```sql
-- Attempt graceful cancel first
SELECT pg_cancel_backend(<blocking_pid>);

-- If unyielding after 5 seconds, forcefully terminate backend connection
SELECT pg_terminate_backend(<blocking_pid>);
```

### Action 2: Batch Terminate Zombie "Idle in Transaction" Connections
If dozens of orphaned pool connections are accumulating:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND (now() - state_change) > interval '5 minutes'
  AND pid <> pg_backend_pid();
```

---

## 4. Preventive Architecture Guidelines
- Set `idle_in_transaction_session_timeout = '30000ms'` in PostgreSQL config to automatically auto-kill leaked connections.
- Set `statement_timeout = '15000ms'` on web app database users to prevent runaway analytical queries on operational OLTP tables.
- In DDL migrations (e.g., `ALTER TABLE`), always execute `SET lock_timeout = '3s';` before schema modifications to prevent table-level pileups.
