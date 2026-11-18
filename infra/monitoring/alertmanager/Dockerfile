# Narrow source repair inside the existing Alertmanager service, linux/amd64 only.
# Go, upstream commit/archive, patch and base image are verified immutable inputs.
FROM --platform=linux/amd64 docker.io/library/golang:1.26.11-bookworm@sha256:79ecd0a7157c7a4cf3b281ced8465350591bf54fedab540e75374a003e1fde7e AS smtp-build
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOMAXPROCS=2
WORKDIR /src
# Remote ADD does not extract; verify checksum before tar on older OCI builders too.
ADD https://codeload.github.com/prometheus/alertmanager/tar.gz/8cf67a8e75004bad6c3c6bacc829945cf8a3ee65 /tmp/upstream.tar.gz
RUN echo '8d83e7d2bfeae6f74966fdb42d29ffdc1c2f343ebffd7aa29ac24080e923230d  /tmp/upstream.tar.gz' | sha256sum -c - && tar --no-same-owner -xzf /tmp/upstream.tar.gz --strip-components=1 -C /src && rm /tmp/upstream.tar.gz
ADD https://github.com/prometheus/alertmanager/releases/download/v0.35.0/alertmanager-web-ui-0.35.0.tar.gz /tmp/ui.tar.gz
RUN echo 'c6af197ce7dbd85be0ac62b50e031eb17945385f782d12039d37f71b752b63db  /tmp/ui.tar.gz' | sha256sum -c - && tar --no-same-owner -xzf /tmp/ui.tar.gz -C /src/ui/app && rm /tmp/ui.tar.gz
COPY alertmanager/smtp-transport.patch /tmp/smtp-transport.patch
COPY alertmanager/smtp_transport_test.go /src/notify/email/smtp_transport_test.go
RUN git apply --check /tmp/smtp-transport.patch && git apply /tmp/smtp-transport.patch && go mod verify && \
    go test -p 2 ./notify/email && \
    go build -p 2 -trimpath -buildvcs=false -ldflags="-s -w -X github.com/prometheus/common/version.Version=0.35.0-circulair.smtp1 -X github.com/prometheus/common/version.Revision=8cf67a8e75004bad6c3c6bacc829945cf8a3ee65+smtp1" -o /out/alertmanager ./cmd/alertmanager && \
    go build -p 2 -trimpath -buildvcs=false -ldflags="-s -w" -o /out/amtool ./cmd/amtool
FROM --platform=linux/amd64 docker.io/prom/alertmanager:v0.35.0@sha256:0f6727a39ff00b6cf95e8a5ebaf7442c55af855b79c689fb9a060e2bada1ecbf
COPY --from=smtp-build /out/alertmanager /bin/alertmanager
COPY --from=smtp-build /out/amtool /bin/amtool
COPY alertmanager/alertmanager.yml /etc/alertmanager/alertmanager.yml
COPY --chmod=0555 alertmanager/approved-config.sh /opt/monitoring/approved-config.sh
COPY --chmod=0555 alertmanager/entrypoint.sh /opt/monitoring/entrypoint.sh
USER 65534:65534
ENTRYPOINT ["/opt/monitoring/entrypoint.sh"]
