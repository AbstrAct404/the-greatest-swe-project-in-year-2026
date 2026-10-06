"""Fetch NYC Parks property records."""
import json
from urllib.parse import urlencode
from urllib.request import urlopen

DEFAULT_LIMIT = 100
DEFAULT_OFFSET = 0

PARKS_API_URL = (
    "https://data.cityofnewyork.us/resource/enfh-gkve.json"
)


def fetch_park_records(limit=DEFAULT_LIMIT, offset=DEFAULT_OFFSET):
    """Return one page of records with original field names."""
    params = urlencode({
        "$limit": limit,
        "$offset": offset,
        "$order": "objectid",
    })
    url = f"{PARKS_API_URL}?{params}"

    with urlopen(url, timeout=15) as response:
        return json.load(response)
