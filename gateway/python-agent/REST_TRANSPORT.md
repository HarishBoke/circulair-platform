# Python host agent: REST transport configuration

## Secure default and migration

`HOST_TYPE=rest_api` no longer falls back to `http://192.168.1.100/api/battery`. `HOST_API_URL` defaults to an empty string, so an unconfigured REST reader returns `None` without making an HTTP request. This is intentional: no host system, simulator, or TLS endpoint is assumed to exist. Other reader defaults and the main gateway loop are unchanged; this REST change does not disable MQTT initialization when the full agent is started.

For an existing LAN REST integration, provision or confirm a trusted HTTPS endpoint before enabling the REST reader. Explicitly set `HOST_API_URL` to its absolute HTTPS URL and set `HOST_TYPE=rest_api` in the deployment configuration. Confirm the endpoint's certificate chain is trusted by Requests and its certificate identity matches the configured hostname or IP. HTTPS on RFC1918/private hosts is supported when certificate verification succeeds. Do not disable certificate verification to accommodate an untrusted or mismatched certificate. This change does not provision TLS, devices, or a proxy.

An illustrative configuration URL is `https://battery.example.invalid/api/battery`; it is documentation only, not a reachable device. Preserve the existing optional `HOST_API_KEY` configuration if the API needs a Bearer token, and manage that value through the deployment's secret mechanism. Do not put credentials in URL userinfo, URLs, or logs.

If the old endpoint redirects to a new address, configure the approved final HTTPS URL directly. Redirects are disabled and all 300–399 responses are rejected without parsing their body. There is no unsafe opt-in for plaintext LAN traffic. If a device supports only HTTP, the non-loopback URL must not be used by this reader; a separately reviewed TLS-capable integration is required before migration.

## Local-only HTTP exception

Only exact loopback host spellings are allowed with HTTP: `localhost` (case-insensitive), `127.0.0.1`, and bracketed `[::1]`. An optional valid port and API path may be supplied, for example `http://127.0.0.1:8080/api/battery` for an independently started local simulator. No simulator is started or assumed by this change.

Other 127/8 addresses, alternate numeric forms, trailing-dot localhost, localhost subdomains, IPv4-mapped IPv6, expanded IPv6 loopback spellings, private LAN ranges, link-local hosts, and unspecified addresses are not HTTP exceptions. The exception is literal, not DNS-based. Local HTTP remains plaintext, including a Bearer header if configured: use HTTPS rather than this exception when local confidentiality is needed, and trust the local service and hostname resolution.

## Validation and failure behavior

The reader validates before requesting or constructing the Authorization header. It rejects missing/non-absolute URLs, schemes other than HTTP/HTTPS, userinfo, any fragment delimiter, whitespace/control characters, backslashes, invalid percent escapes, missing or malformed authorities/hostnames, and invalid/empty/out-of-range/zero ports. DNS hostnames use ASCII labels; use an appropriate ASCII/punycode hostname if needed. No DNS lookup is performed by validation.

Requests retain the existing `timeout=10`, explicitly use `verify=True`, and disable redirects with `allow_redirects=False`. HTTPS certificate verification is not bypassed. Configuration, redirect, transport/status, and payload failures return `None` with fixed error messages. Exception text, URL, token, traceback, redirect Location, and upstream body are not included in this reader's error messages. External HTTP/proxy tooling or library debug logging has its own configuration and is outside this log guarantee.

The JSON field aliases, canonical-field precedence, conversion/defaults, rounding, timestamps, metadata, thermal threshold, and `None` failure behavior are unchanged. HTTPS URLs remain administrator-configured and are not a general SSRF allowlist. There is no response-size cap, strict telemetry schema, new CA configuration, dependency pinning, retry, or total wall-clock deadline added here. Requests' 10-second timeout is its existing connect/read inactivity timeout, not a strict total request deadline.

## Offline regression command

Run from the repository root without installing dependencies:

```sh
python3 -B -m unittest discover -s gateway/python-agent -p 'test_rest_transport.py' -v
```

The suite imports the actual agent under a non-main module name, replaces Requests/MQTT/Modbus imports with standard-library test doubles, fixes time, and guards socket/DNS operations. It calls the real `read_rest_api()` function only; the main loop and broker/device constructors are forbidden. The 18 test methods cover HTTPS success and sanitized failures, exact loopback HTTP, non-loopback rejection with/without Bearer credentials, malformed/userinfo/fragment URLs, every 300–399 response without a second request, and preserved parsing behavior. These are offline unit regressions, not a live certificate or device integration check.
