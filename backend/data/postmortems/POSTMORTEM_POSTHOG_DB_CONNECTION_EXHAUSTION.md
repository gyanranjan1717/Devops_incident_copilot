# RCA Postmortem: Database Connection Pool Exhaustion on Feature Flags Evaluation

## Executive Summary
- **Date**: 2025-02-14
- **Duration**: 42 minutes (14:12 UTC - 14:54 UTC)
- **Severity**: P1 - High Impact
- **Impacted Systems**: Public Ingestion API, Feature Flags Service, PostgreSQL Primary & Replicas
- **Authors**: PostHog SRE Team & Core Platform

---

## 1. Incident Timeline
- **14:12 UTC**: Automated alert triggers: `PostgresConnectionPoolSaturated` (> 95% pool capacity on AWS Aurora / Neon cluster).
- **14:15 UTC**: API gateway error rate spikes from 0.02% to 18.4% with HTTP 500 and 504 Gateway Timeouts on `/api/projects/:id/feature_flags/`.
- **14:22 UTC**: On-call SRE inspects `pg_stat_activity`. Observed 400+ connections in state `idle in transaction` holding row-level locks on table `posthog_featureflag`.
- **14:30 UTC**: SRE identifies rogue deployment `release-2025-02-14-1` which introduced an unclosed database transaction block in an asynchronous Celery/Node worker task.
- **14:38 UTC**: Emergency command executed: Force-terminated all idle-in-transaction connections older than 60 seconds.
- **14:42 UTC**: Hotfix rolled out reverting the unclosed transaction block.
- **14:54 UTC**: Connection pool returns to normal baseline (22% capacity). Error rate returns to < 0.01%. Incident closed.

---

## 2. Root Cause Analysis (5 Whys)
1. **Why did API requests time out with 504?**
   Because web workers could not acquire a database connection from the connection pool within the 5000ms checkout timeout.
2. **Why was the connection pool depleted?**
   Because 380 worker threads had opened database transactions but failed to execute `COMMIT` or `ROLLBACK`.
3. **Why did the worker threads hold transactions open?**
   A code change inside the feature flag caching fallback handled an external Redis connection timeout using an early `return` statement before the context manager exited, skipping transaction cleanup.
4. **Why didn't the database automatically kill these dead connections?**
   The PostgreSQL cluster parameter `idle_in_transaction_session_timeout` was configured to `0` (disabled) by default.
5. **Why wasn't this caught in staging?**
   Staging test suites mocked the Redis fallback path and did not simulate prolonged network timeouts.

---

## 3. Evidence & Diagnostic Artifacts
Query used during triage:
```sql
SELECT pid, usename, client_addr, now() - state_change as idle_duration, query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY idle_duration DESC;
```
Result revealed 380 rows with query `SELECT * FROM posthog_featureflag WHERE key = $1 FOR SHARE;` remaining open for > 15 minutes.

---

## 4. Remediation Steps Taken
```sql
-- Immediate remediation: terminate rogue idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND (now() - state_change) > interval '1 minute'
  AND pid != pg_backend_pid();
```

---

## 5. Preventive Action Items
1. [x] Configure `idle_in_transaction_session_timeout = 30000` (30 seconds) at the PostgreSQL server level.
2. [x] Wrap all database sessions in strict Python/TypeScript context managers with automatic rollback on unhandled exceptions.
3. [x] Introduce PgBouncer in transaction pooling mode between web API workers and PostgreSQL primary.
