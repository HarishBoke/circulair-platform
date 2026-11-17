# Exact official tag + verified linux/amd64 manifest. See image-pins.json.
FROM --platform=linux/amd64 docker.io/library/caddy:2.11.9@sha256:fc9cbc100585871d18d4e451cca7021785c90a7006087427ae5ceb3e4efe6424
COPY tools/guards.sh /opt/monitoring/guards.sh
COPY gateway/Caddyfile /etc/caddy/Caddyfile
COPY --chmod=0555 gateway/entrypoint.sh /opt/monitoring/entrypoint.sh
ENV HOME=/tmp
# Guarded high ports do not need Caddy's optional low-port capability.
RUN test -f /usr/bin/caddy && test -x /usr/bin/caddy && test "$(stat -c '%a' /usr/bin/caddy)" = 755 && setcap -r /usr/bin/caddy
USER 65534:65534
ENTRYPOINT ["/opt/monitoring/entrypoint.sh"]
