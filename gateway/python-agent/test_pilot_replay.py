import contextlib
import copy
import io
import json
import tempfile
import time
import unittest
from unittest.mock import patch
from pathlib import Path
import datetime as dt
import uuid
import pilot_replay as pilot

def profile():
    return {"assetRef": str(uuid.uuid4()), "captureRevision": "fixture/1", "units": dict(pilot.UNITS), "acceptedReadingEnvelope": {"vPack": {"min": 0, "max": 15}, "iPack": {"min": -5, "max": 5}, "socReported": {"min": 0, "max": 100}}}
def sample():
    return {"sampleId": str(uuid.uuid4()), "recordedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "source": "BMS_REPORTED", "captureRevision": "fixture/1", "metrics": {"vPack": 0, "iPack": 0, "socReported": 0}, "units": {"vPack": "V", "iPack": "A", "socReported": "%"}}
class Response:
    def __init__(self, body, status=201):
        self.status_code=status
        self.body=body
        self.closed=False
    def iter_content(self, size):
        yield self.body
    def close(self):
        self.closed=True
class Session:
    def __init__(self, response):
        self.response=response
        self.calls=[]
        self.trust_env=True
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def post(self,*args,**kwargs):
        self.calls.append((args,kwargs))
        return self.response
class PilotReplayTests(unittest.TestCase):
    def setUp(self):
        self.network=patch("socket.socket.connect", side_effect=AssertionError("network forbidden"))
        self.dns=patch("socket.getaddrinfo", side_effect=AssertionError("DNS forbidden unless stubbed"))
        self.network.start(); self.dns.start()
        self.addCleanup(self.network.stop); self.addCleanup(self.dns.stop)
    def test_explicit_zero_preserved(self):
        p,s=profile(),sample()
        self.assertEqual(pilot.validate_sample(s,p)["metrics"]["vPack"],0)
    def test_optional_unknown_absent(self):
        self.assertNotIn("tPack",pilot.validate_sample(sample(),profile())["metrics"])
    def test_reject_source_classes(self):
        for source in ("measured","SYNTHETIC","DERIVED","REFERENCE_MEASUREMENT"):
            s=sample();s["source"]=source
            with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_unknown_fields(self):
        s=sample();s["soh"]=100
        with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_nonfinite_types(self):
        for value in (float("nan"),float("inf"),True,"0",None):
            s=sample();s["metrics"]["vPack"]=value
            with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_wrong_units(self):
        s=sample();s["units"]["vPack"]="mV"
        with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_missing_units(self):
        s=sample();del s["units"]["iPack"]
        with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_undocumented_metric(self):
        s=sample();s["metrics"]["tPack"]=20;s["units"]["tPack"]="degC"
        with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_outside_envelope(self):
        s=sample();s["metrics"]["vPack"]=16
        with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile())
    def test_reject_future_stale(self):
        for delta in (-301,31):
            s=sample();s["recordedAt"]=dt.datetime.fromtimestamp(1000000+delta,dt.timezone.utc).isoformat()
            with self.assertRaises(pilot.PilotValidationError):pilot.validate_sample(s,profile(),now=1000000)
    def test_archived_dry_run_no_time_rewrite(self):
        s=sample();s["recordedAt"]="2020-01-01T00:00:00Z"
        self.assertEqual(pilot.validate_sample(s,profile(),require_fresh=False)["recordedAt"],s["recordedAt"])
    def test_invalid_dates(self):
        for value in ("2026-02-30T01:00:00Z","2026-01-01",0):
            with self.assertRaises(pilot.PilotValidationError):pilot.timestamp(value)
    def test_duplicate_json_keys(self):
        with self.assertRaises(pilot.PilotValidationError):pilot.load_json('{"source":"SYNTHETIC","source":"BMS_REPORTED"}')
    def test_nonfinite_json(self):
        with self.assertRaises(pilot.PilotValidationError):pilot.load_json('{"vPack":NaN}')
    def test_excessive_nesting(self):
        with self.assertRaises(pilot.PilotValidationError):pilot.load_json("["*17+"0"+"]"*17)
    def test_empty_capture(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/"capture";file.write_text("")
            with self.assertRaises(pilot.PilotValidationError):pilot.load_capture(file,profile())
    def test_capture_max_sample_bound(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/"capture";file.write_text(json.dumps(sample())+"\n"+json.dumps(sample())+"\n")
            with self.assertRaises(pilot.PilotValidationError):pilot.load_capture(file,profile(),1)
    def test_capture_payload_mismatch_same_uuid(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/"capture";s=sample();other=copy.deepcopy(s);other["metrics"]["vPack"]=1
            file.write_text(json.dumps(s)+"\n"+json.dumps(other)+"\n")
            with self.assertRaises(pilot.PilotValidationError):pilot.load_capture(file,profile())
    def test_oversized_capture_line(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/"capture";file.write_text(" "*8193+"0\n")
            with self.assertRaises(pilot.PilotValidationError):pilot.load_capture(file,profile())
    def test_default_main_dry_run_never_dns_or_network(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/"profile";c=Path(directory)/"capture"
            p.write_text(json.dumps(profile()));c.write_text(json.dumps(sample())+"\n")
            output=io.StringIO()
            with contextlib.redirect_stdout(output): self.assertEqual(pilot.main(["--capture",str(c),"--profile",str(p)]),0)
            result=json.loads(output.getvalue());self.assertEqual(result["network_requests"],0);self.assertEqual(result["mode"],"offline_dry_run")
    def test_send_cannot_allow_stale_option(self):
        with contextlib.redirect_stdout(io.StringIO()):self.assertEqual(pilot.main(["--capture","ignored","--profile","ignored","--send","--allow-stale-dry-run"]),1)
    def test_origin_exact_https_explicit_approval(self):
        self.assertEqual(pilot.validate_origin("https://pilot.example.org","https://pilot.example.org"),"pilot.example.org")
        for origin,approved in [("http://pilot.example.org","http://pilot.example.org"),("https://pilot.example.org",None),("https://pilot.example.org/","https://pilot.example.org/"),("https://user:secret@pilot.example.org","https://user:secret@pilot.example.org"),("https://pilot.example.org:443","https://pilot.example.org:443"),("https://127.0.0.1","https://127.0.0.1"),("https://169.254.169.254","https://169.254.169.254"),("https://localhost","https://localhost"),("https://pilot.local","https://pilot.local")]:
            with self.assertRaises(pilot.PilotValidationError):pilot.validate_origin(origin,approved)
    def test_private_dns_prevents_post(self):
        session=Session(Response(b"{}"))
        with patch("socket.getaddrinfo",return_value=[(2,1,6,"",("127.0.0.1",443))]):
            with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([sample()],profile(),"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()+10,lambda:session)
        self.assertEqual(session.calls,[])
    def test_tls_no_redirect_proxy_and_actual_receipt(self):
        p,s=profile(),sample();receipt={"readingId":41,"assetRef":p["assetRef"],"sampleId":s["sampleId"],"duplicate":False}
        response=Response(json.dumps(receipt).encode());session=Session(response)
        with patch("socket.getaddrinfo",return_value=[(2,1,6,"",("93.184.216.34",443))]):
            self.assertEqual(pilot.send_samples([s],p,"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()+10,lambda:session),[receipt])
        kwargs=session.calls[0][1];self.assertIs(kwargs["verify"],True);self.assertIs(kwargs["allow_redirects"],False);self.assertIs(session.trust_env,False);self.assertTrue(response.closed)
    def test_redirect_not_followed(self):
        session=Session(Response(b"{}",302))
        with patch("socket.getaddrinfo",return_value=[(2,1,6,"",("93.184.216.34",443))]):
            with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([sample()],profile(),"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()+10,lambda:session)
        self.assertEqual(len(session.calls),1)
    def test_receipt_zero_invalid(self):
        p,s=profile(),sample();session=Session(Response(json.dumps({"readingId":0,"assetRef":p["assetRef"],"sampleId":s["sampleId"],"duplicate":False}).encode()))
        with patch("socket.getaddrinfo",return_value=[(2,1,6,"",("93.184.216.34",443))]):
            with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([s],p,"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()+10,lambda:session)
    def test_receipt_size_bounded(self):
        session=Session(Response(b" "*8193))
        with patch("socket.getaddrinfo",return_value=[(2,1,6,"",("93.184.216.34",443))]):
            with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([sample()],profile(),"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()+10,lambda:session)
    def test_expired_deadline_no_post(self):
        session=Session(Response(b"{}"))
        with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([sample()],profile(),"https://pilot.example.org","https://pilot.example.org","lp1_"+"a"*43,time.monotonic()-1,lambda:session)
        self.assertEqual(session.calls,[])
    def test_missing_token_prevents_dns(self):
        with self.assertRaises(pilot.PilotValidationError):pilot.send_samples([sample()],profile(),"https://pilot.example.org","https://pilot.example.org",None,time.monotonic()+10)
if __name__ == "__main__": unittest.main()
