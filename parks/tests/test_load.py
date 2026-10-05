"""Tests for the NYC Parks data loader."""
import io
import json
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from parks.load import fetch_park_records


@patch("parks.load.urlopen")
def test_fetch_park_records(mock_urlopen):
    sample = [{
        "objectid": "1",
        "gispropnum": "M001",
        "signname": "Example Park",
        "borough": "M",
        "typecategory": "Neighborhood Park",
    }]
    mock_urlopen.return_value = io.BytesIO(
        json.dumps(sample).encode()
    )

    assert fetch_park_records(limit=5, offset=10) == sample

    args, kwargs = mock_urlopen.call_args
    url = urlparse(args[0])
    assert url.scheme == "https"
    assert url.netloc == "data.cityofnewyork.us"
    assert url.path == "/resource/enfh-gkve.json"

    params = parse_qs(url.query)
    assert params["$limit"] == ["5"]
    assert params["$offset"] == ["10"]
    assert params["$order"] == ["objectid"]
    assert kwargs["timeout"] == 15
