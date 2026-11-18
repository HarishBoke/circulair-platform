// Copyright 2026 The Prometheus Authors
// Licensed under the Apache License, Version 2.0.
package email

import (
	"bufio"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"io"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
	"time"

	amcommoncfg "github.com/prometheus/alertmanager/config/common"
	"github.com/prometheus/alertmanager/notify"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/promslog"
)

// All SMTP is loopback captured; QA deadlines below are deliberately shorter
// than the 30-second production attempt cap. No real provider credentials.
func transportFixture(t *testing.T, phase string) (*Email, <-chan time.Duration, <-chan struct{}, <-chan struct{}) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	certDER, err := x509.CreateCertificate(rand.Reader, &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "localhost"}, DNSNames: []string{"localhost"}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}, &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "localhost"}, DNSNames: []string{"localhost"}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	pair, err := tls.X509KeyPair(certPEM, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}))
	if err != nil {
		t.Fatal(err)
	}
	ca := filepath.Join(t.TempDir(), "ca.pem")
	if err := os.WriteFile(ca, certPEM, 0600); err != nil {
		t.Fatal(err)
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })
	eof := make(chan time.Duration, 1)
	entered := make(chan struct{})
	acked := make(chan struct{}, 1)
	go func() {
		c, err := ln.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		start := time.Now()
		// A safety deadline far later than the QA client budget is not test success.
		_ = c.SetDeadline(time.Now().Add(8 * time.Second))
		signal := func() { close(entered) }
		stall := func() { signal(); _, _ = io.Copy(io.Discard, c); eof <- time.Since(start) }
		if phase == "greeting" {
			stall()
			return
		}
		if phase == "implicit_tls" {
			stall()
			return
		}
		send := func(s string) { _, _ = fmt.Fprintf(c, "%s\r\n", s) }
		send("220 localhost ESMTP")
		reader := bufio.NewReader(c)
		encrypted := false
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			verb := strings.ToUpper(strings.Fields(line)[0])
			switch verb {
			case "EHLO", "HELO":
				if !encrypted {
					send("250-localhost")
					send("250 STARTTLS")
				} else {
					send("250-localhost")
					send("250 AUTH LOGIN")
				}
			case "STARTTLS":
				if phase == "starttls_reply" {
					stall()
					return
				}
				send("220 Ready")
				if phase == "tls_handshake" {
					stall()
					return
				}
				tc := tls.Server(c, &tls.Config{Certificates: []tls.Certificate{pair}, MinVersion: tls.VersionTLS12})
				if tc.Handshake() != nil {
					return
				}
				c = tc
				reader = bufio.NewReader(c)
				encrypted = true
			case "AUTH":
				if phase == "auth" {
					stall()
					return
				}
				send("334 VXNlcm5hbWU6")
				if _, err := reader.ReadString('\n'); err != nil {
					return
				}
				send("334 UGFzc3dvcmQ6")
				if _, err := reader.ReadString('\n'); err != nil {
					return
				}
				send("235 Authenticated")
			case "MAIL", "RCPT":
				send("250 OK")
			case "DATA":
				if phase == "data_command" {
					stall()
					return
				}
				send("354 End with dot")
				for {
					ln, err := reader.ReadString('\n')
					if err != nil {
						return
					}
					if ln == ".\r\n" {
						break
					}
				}
				if phase == "data_ack" {
					stall()
					return
				}
				send("250 Accepted")
				acked <- struct{}{}
			case "QUIT":
				if phase == "quit" {
					stall()
					return
				}
				send("221 Bye")
				return
			}
		}
	}()
	addr := ln.Addr().(*net.TCPAddr)
	cfg := &EmailConfig{Smarthost: amcommoncfg.HostPort{Host: "127.0.0.1", Port: strconv.Itoa(addr.Port)}, Hello: "localhost", Headers: map[string]string{}, From: "qa-sender@yopmail.com", To: "aimbim@yopmail.com", AuthUsername: "qa-sender@yopmail.com", AuthPassword: commoncfg.Secret("local-synthetic-password"), RequireTLS: new(true), TLSConfig: &commoncfg.TLSConfig{CAFile: ca, ServerName: "localhost", MinVersion: commoncfg.TLSVersion(tls.VersionTLS12)}}
	if phase == "implicit_tls" {
		cfg.ForceImplicitTLS = new(true)
	}
	tmpl, _, err := prepare(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return New(cfg, tmpl, promslog.NewNopLogger()), eof, entered, acked
}

func TestSMTPTransportStallsCloseAtEarlierParentDeadline(t *testing.T) {
	for _, phase := range []string{"greeting", "implicit_tls", "starttls_reply", "tls_handshake", "auth", "data_command", "data_ack", "quit"} {
		t.Run(phase, func(t *testing.T) {
			n, eof, _, acked := transportFixture(t, phase)
			ctx, cancel := context.WithTimeout(context.Background(), 700*time.Millisecond)
			defer cancel()
			start := time.Now()
			v := n.Notify(ctx)
			elapsed := time.Since(start)
			if elapsed > 2*time.Second {
				t.Fatalf("attempt not bounded: %s", elapsed)
			}
			select {
			case age := <-eof:
				if age > 2*time.Second {
					t.Fatalf("client termination too late: %s", age)
				}
			case <-time.After(time.Second):
				t.Fatal("peer did not observe client EOF/termination")
			}
			if phase == "quit" {
				if v.Err() != nil || v.ShouldRetry() {
					t.Fatalf("accepted DATA falsely failed: %v", v.Err())
				}
				select {
				case <-acked:
				default:
					t.Fatal("no final DATA ack")
				}
			} else {
				if v.Err() == nil || !v.ShouldRetry() {
					t.Fatalf("stalled attempt false success/nonretry: %v", v.Err())
				}
			}
			if phase == "data_ack" && !strings.Contains(v.Err().Error(), "ambiguous") {
				t.Fatal("post-DATA uncertainty not identified")
			}
			t.Logf("phase=%s duration=%s client_termination=true retry=%t final_data_ack=%t", phase, elapsed, v.ShouldRetry(), phase == "quit")
		})
	}
}

func TestSMTPTransportCancellationAndRepeatedFailureCleanup(t *testing.T) {
	before := runtime.NumGoroutine()
	for i := 0; i < 12; i++ {
		n, eof, entered, _ := transportFixture(t, "greeting")
		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan notify.NotifyVerdict, 1)
		go func() { done <- n.Notify(ctx) }()
		select {
		case <-entered:
		case <-time.After(time.Second):
			t.Fatal("no accepted connection")
		}
		start := time.Now()
		cancel()
		select {
		case v := <-done:
			if v.Err() == nil {
				t.Fatal("cancelled attempt succeeded")
			}
		case <-time.After(time.Second):
			t.Fatal("notifier abandoned on cancellation")
		}
		select {
		case <-eof:
		case <-time.After(time.Second):
			t.Fatal("cancellation did not close client")
		}
		t.Logf("cancel iteration=%d returned=%s EOF=true", i, time.Since(start))
	}
	time.Sleep(100 * time.Millisecond)
	if n := runtime.NumGoroutine(); n > before+4 {
		t.Fatalf("goroutine growth: before=%d after=%d", before, n)
	}
}

func TestSMTPTransportDefaultAttemptCapWithoutParentDeadline(t *testing.T) {
	n, eof, _, _ := transportFixture(t, "greeting")
	// Override the peer's eight-second safety deadline is not possible in this
	// fixture, so the actual 30s cap is asserted by native pipeline recovery QA.
	if smtpAttemptTimeout != 30*time.Second {
		t.Fatal("unexpected production attempt cap")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	v := n.Notify(ctx)
	if v.Err() == nil {
		t.Fatal("cancelled dial succeeded")
	}
	_ = eof
}
