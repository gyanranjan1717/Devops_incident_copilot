# PostHog Postmortem: ClickHouse Slow Queries & Ingestion Backpressure

## Summary
- **Date**: 2024-05-30
- **Duration**: 1 hour 45 minutes
- **Impact**: Ingestion queue delay on ClickHouse cluster, delayed dashboard analytics
- **Severity**: P1

## Incident Timeline
- Ingestion worker lag increased past 15 minutes threshold.
- Memory usage across ClickHouse parts merge routines spiked to 92%.
- Several heavy table mutations (ALTER TABLE DELETE) were queued concurrently.
- Queue saturated and blocked real-time events ingestion.

## Root Cause
Concurrent synchronous partition mutations consumed all disk I/O and merge threads, starving incoming batch inserts.

## Mitigation & Fixes
- Killed slow running mutations using `KILL MUTATION WHERE mutation_id = '...'`.
- Rate-limited async batch table optimizations.
- Upgraded worker node storage IOPS.
