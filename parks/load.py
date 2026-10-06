"""Fetch NYC Parks property records."""
import json
from urllib.parse import urlencode
from urllib.request import urlopen

DEFAULT_LIMIT = 100
DEFAULT_OFFSET = 0
MAX_PAGES = 10000

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

def fetch_all_park_records():
    records = []
    limit = DEFAULT_LIMIT
    offset = DEFAULT_OFFSET

    for _ in range(MAX_PAGES):
        page = fetch_park_records(limit=limit, offset=offset)

        if not page:
            return records

        records.extend(page)
        offset += limit

    raise RuntimeError("Maximum number of API pages exceeded")