"""Tests for the NYC Parks data loader."""
import io
import json
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from parks.load import fetch_all_park_records, fetch_park_records

DEFAULT_LIMIT = 5
DEFAULT_OFFSET = 10


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

    assert fetch_park_records(
        limit=DEFAULT_LIMIT, offset=DEFAULT_OFFSET
    ) == sample

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


@patch("parks.load.fetch_park_records")
def test_fetch_all_park_records(mock_fetch):
    mock_fetch.side_effect = [[{"objectid": "1"}], []]
    assert fetch_all_park_records() == [{"objectid": "1"}]
    assert mock_fetch.call_count == 2
