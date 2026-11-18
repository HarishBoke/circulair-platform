#!/bin/sh
set -eu
# Explicit QA output outside the repository; no deployment or service startup.
# Dependencies are pinned by the upstream go.mod/go.sum and verified with sumdb.
[ "$#" = 1 ] || { echo 'Specify private absolute QA output outside repository' >&2; exit 78; }
case "$1" in /*) ;; *) exit 78 ;; esac
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo=$(CDPATH= cd -- "$here/../../.." && pwd)
output=$1
case "$output/" in "$repo/"*) exit 78 ;; esac
umask 077
mkdir -p "$output/downloads" "$output/toolchain" "$output/src" "$output/bin" "$output/logs" "$output/gocache" "$output/gomodcache"
fetch() { curl --fail --location --connect-timeout 15 --max-time 180 --retry 2 "$1" -o "$2"; }
fetch https://go.dev/dl/go1.26.11.linux-amd64.tar.gz "$output/downloads/go.tar.gz"
echo '9849f4e04ee35303714e34fbc3ac8ab44ea3e448a95aa182f91e3b9b79c710ec  '"$output/downloads/go.tar.gz" | sha256sum -c -
fetch https://codeload.github.com/prometheus/alertmanager/tar.gz/8cf67a8e75004bad6c3c6bacc829945cf8a3ee65 "$output/downloads/source.tar.gz"
echo '8d83e7d2bfeae6f74966fdb42d29ffdc1c2f343ebffd7aa29ac24080e923230d  '"$output/downloads/source.tar.gz" | sha256sum -c -
tar -xzf "$output/downloads/go.tar.gz" -C "$output/toolchain"
# Refuse to reapply over an existing source tree; output should be a fresh directory.
[ ! -e "$output/src/go.mod" ] || exit 78
tar -xzf "$output/downloads/source.tar.gz" --strip-components=1 -C "$output/src"
fetch https://github.com/prometheus/alertmanager/releases/download/v0.35.0/alertmanager-web-ui-0.35.0.tar.gz "$output/downloads/ui.tar.gz"
echo 'c6af197ce7dbd85be0ac62b50e031eb17945385f782d12039d37f71b752b63db  '"$output/downloads/ui.tar.gz" | sha256sum -c -
tar -xzf "$output/downloads/ui.tar.gz" -C "$output/src/ui/app"
cd "$output/src"
patch --dry-run -p1 < "$here/smtp-transport.patch"
patch -p1 < "$here/smtp-transport.patch"
cp "$here/smtp_transport_test.go" notify/email/smtp_transport_test.go
export GOTOOLCHAIN=local CGO_ENABLED=0 GOMAXPROCS=2
export GOCACHE="$output/gocache" GOMODCACHE="$output/gomodcache"
go="$output/toolchain/go/bin/go"
"$go" version | tee "$output/logs/go-version.txt"
"$go" test -p 2 -count=1 -v ./notify/email > "$output/logs/go-email-tests.log" 2>&1
"$go" mod verify > "$output/logs/go-mod-verify.log" 2>&1
"$go" build -p 2 -trimpath -buildvcs=false -ldflags='-s -w -X github.com/prometheus/common/version.Version=0.35.0-circulair.smtp1 -X github.com/prometheus/common/version.Revision=8cf67a8e75004bad6c3c6bacc829945cf8a3ee65+smtp1' -o "$output/bin/alertmanager" ./cmd/alertmanager
"$go" build -p 2 -trimpath -buildvcs=false -ldflags='-s -w' -o "$output/bin/amtool" ./cmd/amtool
sha256sum "$output/bin/alertmanager" "$output/bin/amtool" > "$output/logs/binaries.sha256"
echo 'Patched native build and Go notifier tests passed; nothing activated'
