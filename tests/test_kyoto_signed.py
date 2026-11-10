import pytest
import hmac
import hashlib
import json
from unittest.mock import patch, MagicMock
from anilab.kyoto import (
    KyotoResolver,
    sign_kyoto_request,
    KYOTO_CERT_HEX,
    KYOTO_SECRET_HEX,
    KYOTO_APP_VERSION,
    _SIGNING_KEY,
)


def test_kyoto_signature_generation():
    method = "POST"
    path = "/episodes"
    body_bytes = b"id=1000003686"
    headers = sign_kyoto_request(method, path, body_bytes, time_offset=0, device_model="Google Pixel 8")

    assert headers["app-id"] == "com.kyotoplayer"
    assert headers["app-version"] == KYOTO_APP_VERSION
    assert headers["device-model"] == "Google Pixel 8"
    assert headers["X-Kyoto-Cert"] == KYOTO_CERT_HEX
    assert "X-Kyoto-Ts" in headers
    assert "X-Kyoto-Nonce" in headers
    assert "X-Kyoto-Sig" in headers

    # Verify signature math
    ts = headers["X-Kyoto-Ts"]
    nonce = headers["X-Kyoto-Nonce"]
    body_sha256 = hashlib.sha256(body_bytes).hexdigest()
    expected_payload = f"{method}\n{path}\n{body_sha256}\n{ts}\n{nonce}\n{KYOTO_APP_VERSION}"
    expected_sig = hmac.new(_SIGNING_KEY, expected_payload.encode("utf-8"), hashlib.sha256).hexdigest()

    assert headers["X-Kyoto-Sig"] == expected_sig


@pytest.mark.asyncio
async def test_kyoto_resolver_mocked():
    resolver = KyotoResolver(base_url="https://api.kyotoplayer.com")

    mock_episodes_data = {
        "list": [
            {
                "id": "70219",
                "name": "Episode 1",
                "number": "1",
                "filler": False,
                "servers": [
                    {"id": "70219/jpn", "lang": "sub", "name": "SUB Server #1"},
                    {"id": "70219/eng", "lang": "dub", "name": "DUB Server #1"},
                ]
            }
        ]
    }

    mock_stream_data = {
        "link": "https://b1.xlsbox.com/test/master.m3u8",
        "subtitles": [],
        "intro": {"start": 0, "end": 90},
        "outro": {"start": 1200, "end": 1300}
    }

    with patch.object(resolver, "_post_form") as mock_post:
        # 1. Test get_episodes
        mock_post.return_value = mock_episodes_data
        episodes = await resolver.get_episodes("1000003686")
        assert len(episodes) == 1
        assert episodes[0]["id"] == "70219"
        assert episodes[0]["num"] == "1"

        # 2. Test get_servers (should hit pre-populated episode_cache directly)
        servers = await resolver.get_servers("1000003686", "70219")
        assert len(servers) == 2
        assert servers[0]["id"] == "70219/jpn"
        assert servers[0]["lang"] == "sub"
        assert servers[0]["flag"] == "🇯🇵"
        assert servers[1]["id"] == "70219/eng"
        assert servers[1]["lang"] == "dub"
        assert servers[1]["flag"] == "🇺🇸"

        # 3. Test resolve_stream
        mock_post.return_value = mock_stream_data
        stream = await resolver.resolve_stream("1000003686", "70219/jpn")
        assert stream["url"] == "https://b1.xlsbox.com/test/master.m3u8"
        assert stream["intro"]["end"] == 90
        assert stream["outro"]["start"] == 1200

    await resolver.close()
