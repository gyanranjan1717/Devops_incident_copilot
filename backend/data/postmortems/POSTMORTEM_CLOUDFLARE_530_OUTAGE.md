# RCA Postmortem: Edge 530 / 502 Outage Due to Ingress Proxy Route Table Exhaustion

## Executive Summary
- **Incident Type**: Global Ingress Proxy Failures & HTTP 530 / 502 Edge Spikes
- **Affected Services**: Cloudflare Edge Workers, Origin Nginx Gateways, Frontend SPA Hosting
- **Severity**: P1 - Global Impact
- **Root Cause**: BGP route flapping coupled with memory limit saturation on edge reverse proxy buffer allocations.

---

## 1. Timeline of Events
- **08:14 UTC**: Global monitoring detected a sudden drop in edge request completion; HTTP 530 "Origin DNS Error" and 502 "Bad Gateway" spiked across 14 points of presence (PoPs).
- **08:19 UTC**: SRE on-call paged. Edge proxies reported `connect() failed (111: Connection refused) while connecting to upstream`.
- **08:24 UTC**: Origin ingress controllers showed healthy backend pods, but edge proxies had terminated keep-alive sockets due to socket descriptor exhaustion.
- **08:31 UTC**: Edge routing was manually diverted through backup transit providers; edge connection pools were flushed.
- **08:45 UTC**: Global traffic normalized; error rate dropped below 0.05%.

---

## 2. Technical Root Cause
A configuration deployment decreased `proxy_connect_timeout` to an overly aggressive 1000ms while simultaneously enabling keepalive connection multiplexing without enforcing an `upstream_max_conns` limit. Under peak burst traffic, socket queues filled up faster than origin workers could accept TCP handshakes, causing the edge reverse proxy to drop requests with 530/502.

---

## 3. Immediate Mitigation Steps
1. Revert proxy configuration to stable commit:
   ```bash
   git checkout tags/v2.14.0-edge ./ingress/nginx.conf
   nginx -s reload
   ```
2. Increase Linux TCP backlog and socket reuse parameters:
   ```bash
   sysctl -w net.core.somaxconn=4096
   sysctl -w net.ipv4.tcp_tw_reuse=1
   ```

---

## 4. Preventive Actions
- Implement canary testing for edge routing configuration deployments.
- Require automated load testing against mock origin backends prior to promoting proxy timeout adjustments.
