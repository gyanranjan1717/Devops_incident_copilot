# RCA Postmortem: Node.js / Python Memory Leak from Unclosed File Streaming

## Summary
- **Incident ID**: INC-2025-07-104
- **Severity**: P2
- **Duration**: 1 hour 15 minutes
- **Impacted Services**: Reporting Service, Export API, Render Web Service Pods

---

## 1. Description
Customer requests to export large CSV files (500MB+) caused web service instances on Render to crash repeatedly with exit code 137 (Out Of Memory / SIGKILL). When containers restarted, queued export jobs immediately triggered, causing an OOM crash loop backoff.

---

## 2. Root Cause
The export controller accumulated chunks in an uncompressed memory buffer (`Buffer.concat(chunks)` / `bytes_io.write()`) instead of piping the database stream directly to the HTTP response stream (`stream.pipeline(dbStream, gzipTransform, res)`).

---

## 3. Remediation
1. Increased container memory limit on Render temporarily from 1GB to 2GB to allow inflight exports to drain.
2. Refactored export endpoint to pipe the database cursor chunk-by-chunk with chunked transfer encoding (`Transfer-Encoding: chunked`).
3. Memory footprint per export dropped from 650MB to < 18MB.
