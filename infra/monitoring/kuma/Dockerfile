# Caddy guards the direct Render URL without adding another paid resource.
FROM --platform=linux/amd64 docker.io/library/caddy:2.11.9@sha256:fc9cbc100585871d18d4e451cca7021785c90a7006087427ae5ceb3e4efe6424 AS guard
FROM --platform=linux/amd64 docker.io/louislam/uptime-kuma:2.5.12@sha256:bc81e600a1b18824e7eaecbb0167c2a1c732475fc499c1e3253752b965946036
COPY --from=guard /usr/bin/caddy /usr/local/bin/caddy
COPY tools/guards.sh /opt/monitoring/guards.sh
COPY kuma/Caddyfile /etc/caddy/Caddyfile
COPY kuma/readiness.cjs /opt/monitoring/readiness.cjs
COPY kuma/smtp-bounded.cjs kuma/patch-smtp.cjs /opt/monitoring/
RUN node /opt/monitoring/patch-smtp.cjs --install
COPY --chmod=0555 kuma/entrypoint.sh /opt/monitoring/entrypoint.sh
# Guarded high ports do not need Caddy's optional low-port capability.
RUN test -f /usr/local/bin/caddy && test -x /usr/local/bin/caddy && test "$(stat -c '%a' /usr/local/bin/caddy)" = 755 && setcap -r /usr/local/bin/caddy
# Keep sudo present, but prevent node from elevating optional NSCD service helpers.
RUN test -u /usr/bin/sudo && chmod u-s /usr/bin/sudo && chown node:node /app/data
USER node
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/opt/monitoring/entrypoint.sh"]
