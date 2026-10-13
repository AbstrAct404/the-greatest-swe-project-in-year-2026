"""
Fetch NYC Parks property records, clean them into our park documents
and load them into MongoDB.

Run it with: make load
"""
import json
from urllib.parse import urlencode
from urllib.request import urlopen

from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.validation import make_valid

import data.db_connect as dbc
import parks.query as qry

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


# Raw dataset field names:
RAW_ID = 'gispropnum'
RAW_NAME = 'signname'
RAW_TYPE = 'typecategory'
RAW_BOROUGH = 'borough'
RAW_ACRES = 'acres'
RAW_ADDRESS = 'address'
RAW_ZIPCODE = 'zipcode'
RAW_WATERFRONT = 'waterfront'
RAW_RETIRED = 'retired'
RAW_GEOMETRY = 'multipolygon'

TRUE_STRINGS = {'true', 't', 'yes', 'y', '1'}


def to_bool(value) -> bool:
    """The API sends booleans, but older exports used strings."""
    if isinstance(value, str):
        return value.strip().lower() in TRUE_STRINGS
    return bool(value)


def to_acres(value):
    """Acres arrive as a string like "0.351". Returns None if unusable."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def polygons_only(geom):
    """
    make_valid() can return a GeometryCollection with stray lines or
    points in it. Keep just the polygons, as one MultiPolygon.
    """
    if isinstance(geom, MultiPolygon):
        return geom
    if isinstance(geom, Polygon):
        return MultiPolygon([geom])
    polys = []
    for part in getattr(geom, 'geoms', []):
        if isinstance(part, Polygon):
            polys.append(part)
        elif isinstance(part, MultiPolygon):
            polys.extend(part.geoms)
    return MultiPolygon(polys)


def clean_geometry(raw_geom):
    """
    Fix invalid boundaries, which MongoDB's 2dsphere index rejects.
    Returns (geometry, centroid) as GeoJSON, or (None, None) if the
    boundary is missing or has no area.
    Coordinates stay in [longitude, latitude] order.
    """
    if not raw_geom:
        return None, None
    geom = polygons_only(make_valid(shape(raw_geom)))
    if geom.is_empty:
        return None, None
    centroid = geom.centroid
    return (json.loads(json.dumps(mapping(geom))),
            dbc.point(round(centroid.x, 6), round(centroid.y, 6)))


def clean_park(record: dict):
    """
    Turn one raw record into a park document.
    Returns None for retired parks and records we can't use.
    """
    if to_bool(record.get(RAW_RETIRED)):
        return None
    park_id = record.get(RAW_ID)
    geometry, centroid = clean_geometry(record.get(RAW_GEOMETRY))
    if not park_id or geometry is None:
        return None
    return {
        qry.ID: park_id,
        qry.NAME: record.get(RAW_NAME),
        qry.TYPE: record.get(RAW_TYPE),
        qry.BOROUGH: record.get(RAW_BOROUGH),
        qry.ACRES: to_acres(record.get(RAW_ACRES)),
        qry.ADDRESS: record.get(RAW_ADDRESS),
        qry.ZIPCODE: record.get(RAW_ZIPCODE),
        qry.WATERFRONT: to_bool(record.get(RAW_WATERFRONT)),
        qry.GEOMETRY: geometry,
        qry.CENTROID: centroid,
    }


def clean_parks(records: list) -> list:
    """Clean every record, dropping the ones clean_park() rejects."""
    parks = []
    for record in records:
        park = clean_park(record)
        if park is not None:
            parks.append(park)
    return parks


def load_parks(records=None, db=dbc.SE_DB) -> dict:
    """
    Fetch (unless records are given), clean and upsert all parks,
    then make sure the indexes exist. Safe to run again.
    """
    if records is None:
        records = fetch_all_park_records()
    parks = clean_parks(records)
    dbc.connect_db()
    changed = dbc.upsert_many(qry.PARKS_COLLECT, parks, db=db)
    qry.create_indexes(db=db)
    return {
        'fetched': len(records),
        'loaded': len(parks),
        'skipped': len(records) - len(parks),
        'changed': changed,
    }


def main():
    print(load_parks())


if __name__ == '__main__':
    main()
