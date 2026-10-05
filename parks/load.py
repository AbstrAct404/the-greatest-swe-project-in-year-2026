"""Fetch NYC Parks property records."""
import json
from urllib.parse import urlencode
from urllib.request import urlopen


PARKS_API_URL = (
    "https://data.cityofnewyork.us/resource/enfh-gkve.json"
)


def fetch_park_records(limit=100, offset=0):
    """Return one page of records with original field names."""
    params = urlencode({
        "$limit": limit,
        "$offset": offset,
        "$order": "objectid",
    })
    url = f"{PARKS_API_URL}?{params}"

    with urlopen(url, timeout=15) as response:
        return json.load(response)
