# PostHog Postmortem: Kafka Consumer Lag & Rebalance Storm

## Summary
- **Date**: 2023-06-21
- **Duration**: 54 minutes
- **Impact**: Real-time event analytics delayed by 40 minutes
- **Severity**: P1

## Description
A single slow consumer thread exceeded `max.poll.interval.ms` (300,000ms) while processing an abnormally large payload. Kafka coordinator evicted the consumer and triggered a full consumer group rebalance.

During the rebalance, all partition processing paused. Once rebalanced, consumers encountered the same large message, triggering another timeout and cascading rebalance loop.

## Remediation
- Temporarily increased `max.poll.interval.ms` to 600,000ms.
- Implemented payload size guardrails (> 1MB messages routed to dead-letter queue).
- Enabled cooperative sticky rebalance protocol in consumer config.
