# Exact official tag + verified linux/amd64 manifest. See image-pins.json.
FROM --platform=linux/amd64 docker.io/prom/alertmanager:v0.35.0@sha256:0f6727a39ff00b6cf95e8a5ebaf7442c55af855b79c689fb9a060e2bada1ecbf
COPY alertmanager/alertmanager.yml /etc/alertmanager/alertmanager.yml
COPY --chmod=0555 alertmanager/entrypoint.sh /opt/monitoring/entrypoint.sh
USER nobody
ENTRYPOINT ["/opt/monitoring/entrypoint.sh"]
