"""Offline REST transport regression tests; no third-party dependencies needed.

Run from the repository root:
    python3 -B -m unittest discover -s gateway/python-agent -p 'test_rest_transport.py' -v
"""

import importlib.util
from datetime import datetime, timezone
import os
from pathlib import Path
import socket
import ssl
import types
import unittest
from unittest.mock import Mock, patch


def load_agent_offline():
    mqtt = types.ModuleType("paho.mqtt.client")
    mqtt.Client = Mock(side_effect=AssertionError("Broker client forbidden"))
    paho = types.ModuleType("paho")
    paho_mqtt = types.ModuleType("paho.mqtt")
    paho.mqtt = paho_mqtt
    paho_mqtt.client = mqtt
    modbus = types.ModuleType("pymodbus.client")
    modbus.ModbusTcpClient = Mock(side_effect=AssertionError("Device client forbidden"))
    pymodbus = types.ModuleType("pymodbus")
    pymodbus.client = modbus
    requests = types.ModuleType("requests")
    requests.get = Mock(side_effect=AssertionError("Unconfigured request forbidden"))
    modules = {
        "paho": paho, "paho.mqtt": paho_mqtt, "paho.mqtt.client": mqtt,
        "pymodbus": pymodbus, "pymodbus.client": modbus, "requests": requests,
    }
    spec = importlib.util.spec_from_file_location(
        "rest_transport_test_agent", Path(__file__).with_name("circul_air_host_agent.py")
    )
    agent = importlib.util.module_from_spec(spec)
    with patch.dict("sys.modules", modules), patch.dict(os.environ, {}, clear=True):
        spec.loader.exec_module(agent)
    return agent


class RestTransportTests(unittest.TestCase):
    URL = "https://battery.example.invalid/api/battery?fixture=endpoint-marker"
    KEY = "synthetic-token-marker"
    BODY = "synthetic-upstream-body-marker"

    def setUp(self):
        self.socket_guard = patch.object(socket, "socket", side_effect=AssertionError("Network forbidden"))
        self.dns_guard = patch.object(socket, "getaddrinfo", side_effect=AssertionError("DNS forbidden"))
        self.socket_guard.start()
        self.addCleanup(self.socket_guard.stop)
        self.dns_guard.start()
        self.addCleanup(self.dns_guard.stop)
        self.agent = load_agent_offline()
        self.default_url = self.agent.HOST_API_URL
        self.agent.HOST_API_URL = self.URL
        self.agent.HOST_API_KEY = self.KEY
        self.agent.DEVICE_BPAN = "A" * 21
        self.agent.DEVICE_ID = "DEV-mock"
        self.agent.CHEMISTRY = "LFP"
        self.response = Mock()
        self.response.status_code = 200
        self.response.json.return_value = {"vPack": 0}
        self.agent.requests.get.side_effect = None
        self.agent.requests.get.return_value = self.response
        self.clock = patch.object(self.agent, "datetime")
        clock = self.clock.start()
        self.addCleanup(self.clock.stop)
        clock.now.return_value = datetime(2026, 11, 17, 19, 0, 0, tzinfo=timezone.utc)
        self.main_guard = patch.object(self.agent, "main", side_effect=AssertionError("Main forbidden"))
        self.main_guard.start()
        self.addCleanup(self.main_guard.stop)
        self.broker_guard = patch.object(self.agent, "build_mqtt_client", side_effect=AssertionError("Broker forbidden"))
        self.broker_guard.start()
        self.addCleanup(self.broker_guard.stop)

    def tearDown(self):
        self.agent.mqtt.Client.assert_not_called()
        self.agent.ModbusTcpClient.assert_not_called()
        self.agent.main.assert_not_called()
        self.agent.build_mqtt_client.assert_not_called()

    def assert_sanitized(self, logs, endpoint=None):
        text = "\n".join(logs.output)
        for value in (self.URL, self.KEY, self.BODY, "endpoint-marker", "Bearer"):
            self.assertNotIn(value, text)
        if endpoint:
            self.assertNotIn(endpoint, text)
        self.assertNotIn("Traceback", text)

    def assert_rejected_before_request(self, endpoint):
        self.agent.HOST_API_URL = endpoint
        self.agent.requests.get.reset_mock()
        with self.assertLogs(self.agent.log, level="ERROR") as logs:
            self.assertIsNone(self.agent.read_rest_api())
        self.agent.requests.get.assert_not_called()
        self.assert_sanitized(logs, endpoint if isinstance(endpoint, str) and endpoint else None)

    def assert_one_request(self, endpoint=None, headers=None):
        self.agent.requests.get.assert_called_once_with(
            endpoint or self.URL,
            headers=headers if headers is not None else {"Authorization": f"Bearer {self.KEY}"},
            timeout=10, allow_redirects=False, verify=True,
        )

    def test_unconfigured_default_rejected_before_request(self):
        self.assertEqual(self.default_url, "")
        self.assert_rejected_before_request(self.default_url)

    def test_https_with_bearer_accepted(self):
        self.assertIsNotNone(self.agent.read_rest_api())
        self.assert_one_request()
        self.response.raise_for_status.assert_called_once_with()
        self.response.json.assert_called_once_with()

    def test_https_without_bearer_accepted(self):
        self.agent.HOST_API_KEY = ""
        self.assertIsNotNone(self.agent.read_rest_api())
        self.assert_one_request(headers={})

    def test_explicit_https_addresses_accepted(self):
        for endpoint in (
            "https://192.168.1.100:8443/api/battery",
            "https://[2001:db8::1]:8443/api/battery",
            "https://battery.example.invalid./api/battery",
            "https://battery.example.invalid/api/battery%20fixture?value=%23",
        ):
            with self.subTest(endpoint=endpoint):
                self.agent.requests.get.reset_mock()
                self.agent.HOST_API_URL = endpoint
                self.assertIsNotNone(self.agent.read_rest_api())
                self.assert_one_request(endpoint)

    def test_exact_loopback_http_accepted(self):
        for host in ("localhost", "LOCALHOST", "127.0.0.1", "[::1]"):
            with self.subTest(host=host):
                endpoint = f"http://{host}:8080/api/battery"
                self.agent.HOST_API_URL = endpoint
                self.agent.requests.get.reset_mock()
                self.assertIsNotNone(self.agent.read_rest_api())
                self.assert_one_request(endpoint)

    def test_non_loopback_http_rejected_with_and_without_bearer(self):
        hosts = (
            "192.168.1.100", "10.0.0.1", "172.16.0.1", "169.254.1.1",
            "battery.example.invalid", "8.8.8.8", "localhost.example.invalid",
            "localhost.", "127.0.0.2", "127.1", "2130706433", "0x7f000001",
            "[::ffff:127.0.0.1]", "[0:0:0:0:0:0:0:1]", "[fc00::1]", "0.0.0.0",
        )
        for key in ("", self.KEY):
            self.agent.HOST_API_KEY = key
            for host in hosts:
                with self.subTest(host=host, bearer=bool(key)):
                    self.assert_rejected_before_request(f"http://{host}/api/battery")

    def test_userinfo_fragments_malformed_and_unsupported_rejected(self):
        endpoints = (
            None, 42, "", "battery.example.invalid/api/battery", "/api/battery",
            "//battery.example.invalid/api/battery", "ftp://battery.example.invalid/api",
            "file:///tmp/battery.json", "https:///api/battery", "https://",
            "https://user:synthetic-token-marker@battery.example.invalid/api",
            "http://user@localhost/api", "https://@battery.example.invalid/api",
            "https://battery.example.invalid/api#fragment", "https://battery.example.invalid/api#",
            "https://battery.example.invalid:bad/api", "https://battery.example.invalid:65536/api",
            "https://battery.example.invalid:0/api", "https://battery.example.invalid:/api",
            "https://[::1/api", "https://[::1]suffix/api", "https://[::1]::443/api",
            "https://battery.example.invalid\\@localhost/api", "https://bad host/api",
            " https://battery.example.invalid/api", "https://battery.example.invalid/\napi",
            "https://battery.example.invalid/\x00api", "https://battery.example.invalid/%zz",
            "https://battery.example.invalid/%", "https://bad..host/api",
            "https://battery.example.invalid../api", "https://-bad.host/api",
            "https://battery%2eexample.invalid/api", "https://127.1/api",
        )
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_rejected_before_request(endpoint)

    def test_https_transport_errors_sanitized(self):
        detail = f"{self.URL} Bearer {self.KEY} {self.BODY}"
        for error in (TimeoutError(detail), ConnectionError(detail), ssl.SSLError(detail), RuntimeError(detail)):
            with self.subTest(error_type=type(error).__name__):
                self.agent.requests.get.reset_mock()
                self.agent.requests.get.side_effect = error
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_one_request()
                self.assert_sanitized(logs)
                self.response.json.assert_not_called()

    def test_http_error_status_sanitized(self):
        for status in (401, 403, 500):
            with self.subTest(status=status):
                self.response.status_code = status
                self.response.raise_for_status.side_effect = RuntimeError(
                    f"{self.URL} Bearer {self.KEY} {self.BODY}"
                )
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_sanitized(logs)
                self.response.json.assert_not_called()

    def test_all_3xx_rejected_without_redirected_second_request(self):
        for status in range(300, 400):
            with self.subTest(status=status):
                self.agent.requests.get.reset_mock()
                self.response.reset_mock()
                self.response.status_code = status
                self.response.headers = {"Location": "http://192.168.1.100/leak"}
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_one_request()
                self.response.raise_for_status.assert_not_called()
                self.response.json.assert_not_called()
                self.assert_sanitized(logs)

    def test_canonical_field_mapping_and_rounding_preserved(self):
        self.response.json.return_value = {
            "battery_voltage": "52.126", "battery_current": "-3.456",
            "temperature_max": "52.16", "temperature_min": "24.23",
            "cycle_count": "123", "cell_voltage_min": "3.1236",
            "cell_voltage_max": "3.4567",
        }
        self.assertEqual(self.agent.read_rest_api(), {
            "bpan": "A" * 21, "deviceId": "DEV-mock", "source": "measured",
            "recordedAt": "2026-11-17T19:00:00+00:00", "vPack": 52.13,
            "iPack": -3.46, "tMax": 52.16, "vMin": 3.124, "vMax": 3.457,
            "cycleCount": 123,
        })

    def test_alias_mapping_preserved(self):
        self.response.json.return_value = {
            "vPack": "48", "iPack": "-2", "tMax": "30", "tMin": "20",
            "cycles": "12", "vCellMin": "3.1", "vCellMax": "3.2",
        }
        payload = self.agent.read_rest_api()
        self.assertEqual(payload, {
            "bpan": "A" * 21, "deviceId": "DEV-mock", "source": "measured",
            "recordedAt": "2026-11-17T19:00:00+00:00", "vPack": 48.0,
            "iPack": -2.0, "tMax": 30.0, "vMin": 3.1, "vMax": 3.2,
            "cycleCount": 12,
        })

    def test_canonical_keys_take_precedence_over_aliases(self):
        pairs = (
            ("battery_voltage", "vPack", "vPack"),
            ("battery_current", "iPack", "iPack"),
            ("temperature_max", "tMax", "tMax"),
            ("temperature_min", "tMin", None),
            ("cycle_count", "cycles", "cycleCount"),
            ("cell_voltage_min", "vCellMin", "vMin"),
            ("cell_voltage_max", "vCellMax", "vMax"),
        )
        self.response.json.return_value = {
            key: value for canonical, alias, _ in pairs
            for key, value in ((canonical, 2), (alias, 9))
        }
        payload = self.agent.read_rest_api()
        for _, _, output in pairs:
            if output:
                self.assertEqual(payload[output], 2)

    def test_missing_fields_are_unknown_and_empty_payload_rejected(self):
        self.response.json.return_value = {"battery_current": 0}
        payload = self.agent.read_rest_api()
        self.assertEqual(payload["iPack"], 0)
        self.assertNotIn("vPack", payload)
        self.assertNotIn("sohEstimate", payload)
        self.response.json.return_value = {}
        with self.assertLogs(self.agent.log, level="ERROR"):
            self.assertIsNone(self.agent.read_rest_api())

    def test_invalid_json_error_sanitized(self):
        self.response.json.side_effect = ValueError(f"{self.URL} {self.KEY} {self.BODY}")
        with self.assertLogs(self.agent.log, level="ERROR") as logs:
            self.assertIsNone(self.agent.read_rest_api())
        self.assert_sanitized(logs)

    def test_non_object_payload_returns_none(self):
        for value in (None, [], "synthetic-upstream-body-marker"):
            with self.subTest(value_type=type(value).__name__):
                self.response.json.return_value = value
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_sanitized(logs)

    def test_invalid_numeric_values_return_none_sanitized(self):
        for field in ("battery_voltage", "cycle_count"):
            with self.subTest(field=field):
                self.response.json.return_value = {field: self.BODY}
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_sanitized(logs)

    def test_thermal_flags_not_fabricated_by_gateway(self):
        for temperature in (51.0, 51.01):
            self.response.json.return_value = {"temperature_max": temperature}
            self.assertNotIn("thermalAnomaly", self.agent.read_rest_api())

    def test_limits_fractional_cycles_nonfinite_and_unsupported_estimates_rejected(self):
        for data in ({"vPack": -1}, {"vPack": float("inf")}, {"vPack": float("nan")},
                     {"cycles": 1.5}, {"cycles": -1}, {"vPack": True},
                     {"tMax": -274}, {"vCellMin": 3, "vCellMax": 2},
                     {"tMin": 40, "tMax": 30}, {"soc": 50}, {"soh": 100}):
            with self.subTest(data=data):
                self.response.json.return_value = data
                with self.assertLogs(self.agent.log, level="ERROR") as logs:
                    self.assertIsNone(self.agent.read_rest_api())
                self.assert_sanitized(logs)

    def test_unconfigured_identity_rejected_without_telemetry(self):
        self.agent.DEVICE_ID = ""
        with self.assertLogs(self.agent.log, level="ERROR"):
            self.assertIsNone(self.agent.read_rest_api())

    def test_zero_values_preserved_without_inventing_unknown_fields(self):
        self.response.json.return_value = {"vPack": 0, "iPack": 0, "cycles": 0}
        payload = self.agent.read_rest_api()
        self.assertEqual((payload["vPack"], payload["iPack"], payload["cycleCount"]), (0, 0, 0))
        self.assertNotIn("tMax", payload)



if __name__ == "__main__":
    unittest.main()
