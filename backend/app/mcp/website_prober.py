"""
website_prober.py
-----------------
Diagnostic probe tool for user-submitted websites & APIs.
Measures:
- HTTP Status Code & status message
- Response Latency / TTFB (Time to First Byte)
- SSL Certificate validity, issuer, and days until expiration
- Security & CORS Headers inspection
- Detailed error capture on failure (502, 504, ConnectionRefused, DNS failure)
"""

import time
import ssl
import socket
from urllib.parse import urlparse
from typing import Dict, Any, Optional
import httpx

class WebsiteProber:
    async def probe_url(self, target_url: str, timeout_seconds: float = 8.0) -> Dict[str, Any]:
        """
        Executes an asynchronous edge probe against the given target URL.
        Returns live connectivity, latency, SSL, and header diagnostics.
        """
        if not target_url.startswith(("http://", "https://")):
            target_url = "https://" + target_url

        parsed = urlparse(target_url)
        hostname = parsed.hostname or target_url
        port = parsed.port or (443 if parsed.scheme == "https" else 80)

        result: Dict[str, Any] = {
            "target_url": target_url,
            "hostname": hostname,
            "scheme": parsed.scheme,
            "online": False,
            "status_code": None,
            "status_text": None,
            "latency_ms": None,
            "ssl_info": None,
            "headers_summary": {},
            "error_detail": None,
            "diagnostic_summary": ""
        }

        # 1. SSL Certificate Inspection (if HTTPS)
        if parsed.scheme == "https":
            ssl_info = self._inspect_ssl(hostname, port)
            result["ssl_info"] = ssl_info

        # 2. HTTP Request Probe
        start_time = time.time()
        try:
            async with httpx.AsyncClient(
                verify=False,  # Allow probing sites even with self-signed certs so we can diagnose SSL errors
                follow_redirects=True,
                timeout=timeout_seconds,
                headers={"User-Agent": "DevOps-Incident-Copilot-Prober/1.0"}
            ) as client:
                response = await client.get(target_url)
                latency = round((time.time() - start_time) * 1000, 2)

                result["online"] = True
                result["status_code"] = response.status_code
                result["status_text"] = response.reason_phrase
                result["latency_ms"] = latency

                # Extract relevant operational headers
                relevant_headers = [
                    "server", "content-type", "x-powered-by", "via",
                    "cf-ray", "x-render-origin-server", "x-vercel-id",
                    "access-control-allow-origin", "strict-transport-security"
                ]
                headers_summary = {}
                for h in relevant_headers:
                    if h in response.headers:
                        headers_summary[h] = response.headers[h]
                result["headers_summary"] = headers_summary

                # Formulate diagnostic summary
                if response.status_code >= 500:
                    result["diagnostic_summary"] = f"CRITICAL: Target server returned HTTP {response.status_code} ({response.reason_phrase}). Upstream failure detected."
                elif response.status_code >= 400:
                    result["diagnostic_summary"] = f"WARNING: Target server returned HTTP {response.status_code} ({response.reason_phrase}). Client or permission failure."
                else:
                    result["diagnostic_summary"] = f"HEALTHY: Target server responded with HTTP {response.status_code} in {latency}ms."

        except httpx.ConnectTimeout:
            result["error_detail"] = f"Connection timed out after {timeout_seconds}s. Server may be unresponsive or firewalling incoming probes."
            result["diagnostic_summary"] = "CRITICAL: Connection Timeout (Down / Frozen)"
        except httpx.ConnectError as ce:
            result["error_detail"] = f"Connection refused or DNS resolution failed: {str(ce)}"
            result["diagnostic_summary"] = "CRITICAL: Connection Refused / DNS Error"
        except httpx.ReadTimeout:
            result["error_detail"] = f"Read timeout: Server accepted TCP socket but failed to stream HTTP response headers within {timeout_seconds}s."
            result["diagnostic_summary"] = "CRITICAL: Upstream Gateway / Read Timeout (504 Pattern)"
        except Exception as e:
            result["error_detail"] = f"Probe failed with unexpected exception: {str(e)}"
            result["diagnostic_summary"] = f"ERROR: Probe error ({type(e).__name__})"

        return result

    def _inspect_ssl(self, hostname: str, port: int = 443) -> Dict[str, Any]:
        """Inspects SSL certificate attributes and remaining days."""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=3.0) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    not_after_str = cert.get("notAfter")
                    issuer = dict(x[0] for x in cert.get("issuer", []))
                    
                    # Parse expiry
                    import datetime
                    if not_after_str:
                        expire_date = datetime.datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
                        days_left = (expire_date - datetime.datetime.utcnow()).days
                    else:
                        days_left = None

                    return {
                        "valid": True,
                        "issuer_org": issuer.get("organizationName", "Unknown"),
                        "days_remaining": days_left,
                        "expired": days_left is not None and days_left <= 0,
                        "expires_on": not_after_str
                    }
        except ssl.SSLCertVerificationError as ve:
            return {
                "valid": False,
                "error": f"SSL Certificate Verification Failed: {str(ve)}",
                "expired": True
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Unable to verify SSL: {str(e)}"
            }

website_prober = WebsiteProber()
