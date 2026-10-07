"""
Query functions for the parks collection.
All database access goes through data.db_connect.
"""
import data.db_connect as dbc

PARKS_COLLECT = 'parks'

# Park document fields:
ID = dbc.MONGO_ID
NAME = 'name'
TYPE = 'type'
BOROUGH = 'borough'
ACRES = 'acres'
ADDRESS = 'address'
ZIPCODE = 'zipcode'
WATERFRONT = 'waterfront'
GEOMETRY = 'geometry'
CENTROID = 'centroid'
DISTANCE = dbc.DISTANCE_FIELD

# NYC Parks borough codes:
BOROUGHS = {
    'B': 'Brooklyn',
    'M': 'Manhattan',
    'Q': 'Queens',
    'R': 'Staten Island',
    'X': 'Bronx',
}

DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 50
MAX_PER_PAGE = 500
DEFAULT_RADIUS_M = 1000
MAX_RADIUS_M = 50000
DEFAULT_LIMIT = 50

MIN_LAT, MAX_LAT = -90, 90
MIN_LNG, MAX_LNG = -180, 180

# Boundaries are big, so leave them out of list results:
NO_GEOMETRY = {GEOMETRY: 0}


def create_indexes(db=dbc.SE_DB):
    """
    Create every index the parks queries rely on.
    Safe to call more than once.
    """
    dbc.connect_db()
    dbc.create_geo_index(PARKS_COLLECT, GEOMETRY, db=db)
    dbc.create_geo_index(PARKS_COLLECT, CENTROID, db=db)
    dbc.create_text_index(PARKS_COLLECT, NAME, db=db)
    dbc.create_index(PARKS_COLLECT, [(BOROUGH, dbc.pm.ASCENDING)], db=db)
    dbc.create_index(PARKS_COLLECT, [(TYPE, dbc.pm.ASCENDING)], db=db)


def check_lat_lng(lat: float, lng: float):
    """
    Raise ValueError if lat or lng is not a valid coordinate.
    """
    if not isinstance(lat, (int, float)) or not MIN_LAT <= lat <= MAX_LAT:
        raise ValueError(f'Latitude must be between {MIN_LAT} and {MAX_LAT}.')
    if not isinstance(lng, (int, float)) or not MIN_LNG <= lng <= MAX_LNG:
        raise ValueError(f'Longitude must be between {MIN_LNG} and '
                         f'{MAX_LNG}.')


def build_filter(borough=None, park_type=None, min_acres=None) -> dict:
    """
    Turn the optional list filters into a MongoDB filter.
    """
    filt = {}
    if borough is not None:
        borough = borough.upper()
        if borough not in BOROUGHS:
            raise ValueError(f'Borough must be one of {sorted(BOROUGHS)}.')
        filt[BOROUGH] = borough
    if park_type is not None:
        filt[TYPE] = park_type
    if min_acres is not None:
        if min_acres < 0:
            raise ValueError('Minimum acres cannot be negative.')
        filt[ACRES] = {'$gte': min_acres}
    return filt


def get_parks(borough=None, park_type=None, min_acres=None,
              page=DEFAULT_PAGE, per_page=DEFAULT_PER_PAGE,
              db=dbc.SE_DB) -> dict:
    """
    List parks (without boundaries), sorted by name, one page at a time.
    Returns the page of parks plus the total count for paging.
    """
    if page < 1:
        raise ValueError('Page must be 1 or more.')
    if not 1 <= per_page <= MAX_PER_PAGE:
        raise ValueError(f'Per page must be between 1 and {MAX_PER_PAGE}.')
    filt = build_filter(borough, park_type, min_acres)
    dbc.connect_db()
    parks = dbc.read_many(PARKS_COLLECT, filt, db=db,
                          projection=NO_GEOMETRY,
                          sort=[(NAME, dbc.pm.ASCENDING)],
                          skip=(page - 1) * per_page, limit=per_page)
    return {
        'parks': parks,
        'total': dbc.count(PARKS_COLLECT, filt, db=db),
        'page': page,
        'per_page': per_page,
    }


def get_park(park_id: str, db=dbc.SE_DB):
    """
    Return one park, including its boundary, or None if not found.
    """
    dbc.connect_db()
    return dbc.read_one(PARKS_COLLECT, {ID: park_id}, db=db)


def search(text: str, limit=DEFAULT_LIMIT, db=dbc.SE_DB) -> list:
    """
    Search park names, best matches first.
    """
    if not text or not text.strip():
        raise ValueError('Search text cannot be empty.')
    dbc.connect_db()
    return dbc.text_search(PARKS_COLLECT, text, db=db,
                           projection=NO_GEOMETRY, limit=limit)


def near(lat: float, lng: float, radius=DEFAULT_RADIUS_M,
         limit=DEFAULT_LIMIT, db=dbc.SE_DB) -> list:
    """
    Parks whose boundary is within radius meters of the point,
    closest first. Each park gets a distance (in meters) to its edge;
    it is 0 if the point is inside the park.
    """
    check_lat_lng(lat, lng)
    if not 0 < radius <= MAX_RADIUS_M:
        raise ValueError(f'Radius must be between 0 and {MAX_RADIUS_M} m.')
    dbc.connect_db()
    return dbc.geo_near(PARKS_COLLECT, lng, lat, GEOMETRY,
                        max_distance=radius, db=db,
                        projection=NO_GEOMETRY, limit=limit)


def at(lat: float, lng: float, db=dbc.SE_DB) -> list:
    """
    Which park(s) is this point in? Usually zero or one,
    but park boundaries can overlap.
    """
    check_lat_lng(lat, lng)
    dbc.connect_db()
    return dbc.geo_intersects(PARKS_COLLECT, lng, lat, GEOMETRY, db=db,
                              projection=NO_GEOMETRY)
