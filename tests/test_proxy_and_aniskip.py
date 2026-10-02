import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient
from proxy import router as proxy_router, is_safe_proxy_url

def test_proxy_ssrf_validation():
    # Dangerous URLs must be rejected
    assert not is_safe_proxy_url("http://127.0.0.1/admin")
    assert not is_safe_proxy_url("http://localhost:8000/api")
    assert not is_safe_proxy_url("http://169.254.169.254/latest/meta-data")
    assert not is_safe_proxy_url("http://192.168.1.1/router")
    assert not is_safe_proxy_url("http://10.0.0.5:8080/flag")
    assert not is_safe_proxy_url("file:///etc/passwd")
    assert not is_safe_proxy_url("ftp://server/file")

    # Safe external streams must be accepted
    assert is_safe_proxy_url("https://app.kyotoplayer.com/api/v4/stream")
    assert is_safe_proxy_url("https://b1.xlsbox.com/master.m3u8")

def test_proxy_endpoint_blocks_unsafe():
    app = FastAPI()
    app.include_router(proxy_router)
    client = TestClient(app)

    # Attempt SSRF via /proxy/m3u8
    r = client.get("/proxy/m3u8", params={"url": "http://127.0.0.1:8000/secret"})
    assert r.status_code == 400
    assert "Invalid or disallowed" in r.text

    # Attempt SSRF via /proxy/segment
    r2 = client.get("/proxy/segment", params={"url": "http://169.254.169.254/latest"})
    assert r2.status_code == 400
    assert "Invalid or disallowed" in r2.text
