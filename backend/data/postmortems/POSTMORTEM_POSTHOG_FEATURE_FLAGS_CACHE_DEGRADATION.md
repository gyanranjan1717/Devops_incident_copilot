# RCA Postmortem: Redis Cache Eviction Leading to Database Thundering Herd

## Executive Summary
- **Date**: 2025-02-06
- **Duration**: 28 minutes
- **Severity**: P1
- **Impacted Systems**: Redis Cluster, PostgreSQL Replicas, Feature Flag Evaluation Endpoint
- **Trigger**: Cache key TTL synchronization causing cache stampede

---

## 1. Incident Overview
During peak global traffic at 18:00 UTC, the primary Redis cache cluster reached `maxmemory` and triggered aggressive volatile-lru eviction. Simultaneously, a popular feature flag key with a 1-hour fixed TTL expired across all cache shards. 

Over 45,000 concurrent requests bypassed Redis and hammered the PostgreSQL replica directly to fetch the feature flag definitions. The replica CPU hit 100%, query latency degraded from 4ms to 12,400ms, and ingress proxies began dropping connections with 504 Gateway Timeouts.

---

## 2. Root Cause
- Absence of probabilistic early expiration (XFetch algorithm) or cache lock mutex.
- All application pods cached the feature flag key with the exact same 3600-second TTL without random jitter.
- The sudden miss caused a classic **Thundering Herd / Cache Stampede** against the PostgreSQL database.

---

## 3. Immediate Action Taken
1. Temporarily served stale in-memory cached responses directly from Node.js process memory.
2. Manually repopulated the Redis key with an extended 24-hour TTL:
   ```bash
   redis-cli -h redis-cluster.internal SET "flags:global:v2" "{...}" EX 86400
   ```
3. PostgreSQL read-replica CPU dropped from 100% to 14% within 90 seconds.

---

## 4. Remediation & Long-term Fixes
- Added ±20% randomized jitter to all Redis cache TTLs.
- Implemented single-flight request coalescing (using mutex lock) so only one worker queries the database on a cache miss while others wait for the warm result.
