# RCA Postmortem: Database Failover Timeout & Connection Thrashing

## Executive Summary
- **Incident Date**: 2025-01-20
- **Duration**: 34 minutes
- **Severity**: P1 - High
- **Services Impacted**: Authentication API, Primary Database Orchestrator, Connection Pooler
- **Summary**: Primary database failover caused connection stampede exceeding server thread limits.

---

## 1. Description
During a routine scheduled replica switchover, the primary database orchestrator failed to signal PgBouncer/ProxySQL before terminating the old primary instance. 2,400 active client connections were abruptly severed simultaneously.

As 120 web application containers immediately initiated reconnection loops without exponential backoff or jitter, the incoming SYN flood exhausted the OS connection queue (`tcp_max_syn_backlog`) on the new primary, preventing even health checks from completing and rendering the database inaccessible for 34 minutes.

---

## 2. Diagnosis & Root Cause
- Hard reconnect loop without backoff: Web applications retried every 100ms in an infinite loop.
- Lack of connection rate limiting at the proxy layer: PgBouncer client pool size was configured higher than the PostgreSQL server's `max_connections`.

---

## 3. Mitigation Command Executed
1. Scaled down web containers to 20% capacity to relieve connection pressure:
   ```bash
   kubectl scale deployment/api-gateway --replicas=10 -n prod
   ```
2. Flushed connection pools and restarted proxy pooler:
   ```bash
   systemctl restart pgbouncer
   ```
3. Scaled web containers back up incrementally in batches of 10 every 60 seconds.

---

## 4. Remediation
- Implemented exponential backoff with full jitter in database connection client libraries.
- Enforced strict connection pooling ceilings matching PostgreSQL hardware specs.
