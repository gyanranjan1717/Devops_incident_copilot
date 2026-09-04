# RCA Postmortem: Database Connection Pool Exhaustion & Unclosed Cursors

## Summary
- **Incident ID**: INC-2025-03-882
- **Severity**: P1
- **Duration**: 51 minutes
- **Impacted Services**: Payment Processing API, Checkout Service, PostgreSQL Cluster

---

## 1. Timeline
- **10:05 UTC**: Payment API latency P99 spikes from 120ms to 24,000ms.
- **10:09 UTC**: Customers report credit card checkout requests hanging and returning HTTP 504.
- **10:14 UTC**: SRE runs database connection inspection. Neon/PostgreSQL reports `100/100` active pool connections used.
- **10:21 UTC**: SRE identifies that a new batch fraud detection routine was opening cursor transactions inside a loop without closing them on validation failure.
- **10:32 UTC**: Terminated leaking PIDs and killed blocked sessions.
- **10:41 UTC**: Hotfix patch deployed setting `auto_close=True` on DB session context managers.
- **10:56 UTC**: All checkout metrics return to normal baseline.

---

## 2. Root Cause
The database connection pool maximum size was set to 100 connections. A newly merged fraud check function initiated database transactions inside an asynchronous loop. When an external fraud score endpoint timed out, an exception was raised that bypassed the `session.close()` call in the finally block. This leaked 1 database connection per failed fraud check until all 100 pool slots were exhausted.

---

## 3. Immediate Mitigation Command
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND (now() - state_change) > interval '30 seconds';
```

---

## 4. Preventive Action
- Always utilize async context managers (`async with db.begin():`) which guarantee session rollback and release on exception.
- Add connection pool checkout timeout (max 3 seconds) so web requests fail fast rather than hanging indefinitely.
