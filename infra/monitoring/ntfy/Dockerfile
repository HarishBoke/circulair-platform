# Exact official tag + verified linux/amd64 manifest. See image-pins.json.
FROM --platform=linux/amd64 docker.io/binwiederhier/ntfy:v2.38.1@sha256:6ceb27333175e3ce7d021bb883658858f2b8b883db316a73d0755dfa0b306fc4
COPY tools/guards.sh /opt/monitoring/guards.sh
COPY ntfy/server.yml /etc/ntfy/server.yml
COPY --chmod=0555 ntfy/entrypoint.sh /opt/monitoring/entrypoint.sh
RUN mkdir -p /var/lib/ntfy && chown 65534:65534 /var/lib/ntfy
USER 65534:65534
ENTRYPOINT ["/opt/monitoring/entrypoint.sh"]
