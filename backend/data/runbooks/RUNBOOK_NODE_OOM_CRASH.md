# SOP: Node.js Out-Of-Memory (OOM) Crash & Heap Saturation

## Metadata
- **Incident Category**: Application Runtime / Memory Exhaustion
- **Default Severity**: P1 (crash loop backoff impacting traffic) / P2
- **Applicable Services**: Node.js, Express, Fastify, Next.js, Render Web Service, Vercel Functions
- **Tags**: `nodejs`, `oom`, `v8`, `heap-out-of-memory`, `memory-leak`, `render`, `vercel`

---

## 1. Symptoms & Diagnostic Identifiers
- Container killed by OS kernel with exit code `137` (SIGKILL).
- Node.js runtime crashes with message: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.
- Progressive latency degradation before sudden process death (GC thrashing taking 90%+ CPU).
- Increasing resident set size (RSS) that never drops following garbage collection cycles.

---

## 2. Root Cause Classification
1. **Unbounded In-Memory Caches**: Global `Map`, `Object`, or event listeners retaining references indefinitely without TTL or LRU eviction.
2. **Streaming & Large Payloads**: Calling `res.send()` or `fs.readFileSync()` on huge file uploads/exports without streaming pipelines.
3. **Circular Closures / Event Listener Leaks**: `emitter.on()` attached inside request handlers without removing listeners on disconnect.
4. **V8 Default Heap Limit**: Node.js defaulting to 1.4GB on 64-bit systems even when container has more RAM available, or exceeding container cgroup limits (512MB on starter tier).

---

## 3. Emergency Remediation (Stop the Bleeding)

### Step 1: Adjust Node.js Memory Allocation
If the host container has available memory headroom, increase the maximum old space size via environment variable:
```bash
# Set in Render / Kubernetes environment variables
NODE_OPTIONS="--max-old-space-size=2048"
```
*Note: Ensure `--max-old-space-size` is at least 25% below the container cgroup memory limit to allow buffer/C++ allocations.*

### Step 2: Scale Instances to Distribute Load
```bash
# Render: Scale to 2 or more instances in dashboard or CLI
# Kubernetes:
kubectl scale deployment/api-server --replicas=4 -n production
```

### Step 3: Trigger Heap Dump on Near-Exhaustion (Diagnostic)
Add emergency flags to capture post-mortem dumps:
```bash
NODE_OPTIONS="--max-old-space-size=1536 --heapsnapshot-near-heap-limit=3 --diagnostic-dir=/tmp/dumps"
```

---

## 4. Post-Incident Code Fixes
- Replace raw `Map` caches with `lru-cache` package:
  ```javascript
  import { LRUCache } from 'lru-cache';
  const cache = new LRUCache({ max: 5000, ttl: 1000 * 60 * 10 });
  ```
- Use streaming transforms (`stream.pipeline`) instead of buffering large database queries into memory arrays.
