"""Tests for the parks query functions."""
import pytest

import parks.query as qry

CENTRAL_PARK = 'M010'
BRYANT_PARK = 'M008'
WASHINGTON_SQ = 'M098'
NUM_SAMPLE_PARKS = 7

# (lat, lng) points used by the geo tests:
BETHESDA_TERRACE = (40.7740, -73.9708)   # inside Central Park
WASHINGTON_SQ_ARCH = (40.7312, -73.9971)  # inside Washington Square Park
TIMES_SQUARE = (40.7580, -73.9855)       # no park, but near Bryant Park
OUT_AT_SEA = (40.40, -73.70)             # far from every park


def ids(parks):
    return [park[qry.ID] for park in parks]


def test_create_indexes(parks_db):
    indexes = qry.dbc.client[parks_db][qry.PARKS_COLLECT].index_information()
    keys = [index['key'][0] for index in indexes.values()]
    assert (qry.GEOMETRY, '2dsphere') in keys
    assert (qry.CENTROID, '2dsphere') in keys
    assert (qry.BOROUGH, 1) in keys
    assert (qry.TYPE, 1) in keys
    assert ('_fts', 'text') in keys


def test_get_parks_all(parks_db):
    ret = qry.get_parks(db=parks_db)
    assert ret['total'] == NUM_SAMPLE_PARKS
    assert len(ret['parks']) == NUM_SAMPLE_PARKS
    names = [park[qry.NAME] for park in ret['parks']]
    assert names == sorted(names)
    for park in ret['parks']:
        assert qry.GEOMETRY not in park
        assert qry.CENTROID in park


def test_get_parks_by_borough(parks_db):
    ret = qry.get_parks(borough='m', db=parks_db)
    assert sorted(ids(ret['parks'])) == [BRYANT_PARK, CENTRAL_PARK,
                                         WASHINGTON_SQ]
    assert ret['total'] == 3


def test_get_parks_by_type(parks_db):
    ret = qry.get_parks(park_type='Flagship Park', db=parks_db)
    assert sorted(ids(ret['parks'])) == ['B073', CENTRAL_PARK, 'Q099']


def test_get_parks_min_acres(parks_db):
    ret = qry.get_parks(min_acres=500, db=parks_db)
    for park in ret['parks']:
        assert park[qry.ACRES] >= 500
    assert ret['total'] == 3


def test_get_parks_paging(parks_db):
    first = qry.get_parks(page=1, per_page=3, db=parks_db)
    third = qry.get_parks(page=3, per_page=3, db=parks_db)
    assert len(first['parks']) == 3
    assert len(third['parks']) == 1
    assert first['total'] == third['total'] == NUM_SAMPLE_PARKS
    assert not set(ids(first['parks'])) & set(ids(third['parks']))


@pytest.mark.parametrize('kwargs', [
    {'borough': 'Z'},
    {'min_acres': -1},
    {'page': 0},
    {'per_page': 0},
    {'per_page': qry.MAX_PER_PAGE + 1},
])
def test_get_parks_bad_args(kwargs):
    with pytest.raises(ValueError):
        qry.get_parks(**kwargs)


@pytest.mark.parametrize('lat, lng', [
    (-91, -73.9),
    (91, -73.9),
    ('40.7', -73.9),
    (40.7, -181),
    (40.7, 181),
    (40.7, '-73.9'),
])
def test_check_lat_lng_bad_args(lat, lng):
    with pytest.raises(ValueError):
        qry.check_lat_lng(lat, lng)


@pytest.mark.parametrize('lat, lng', [
    (-90, -180),
    (90, 180),
    (0, 0),
])
def test_check_lat_lng_valid_args(lat, lng):
    qry.check_lat_lng(lat, lng)


def test_get_park(parks_db):
    park = qry.get_park(CENTRAL_PARK, db=parks_db)
    assert park[qry.NAME] == 'Central Park'
    assert park[qry.ACRES] == 840.01
    assert park[qry.GEOMETRY]['type'] == 'MultiPolygon'


def test_get_park_missing(parks_db):
    assert qry.get_park('NOPE', db=parks_db) is None


def test_search(parks_db):
    ret = qry.search('central', db=parks_db)
    assert ids(ret['parks']) == [CENTRAL_PARK]
    assert qry.GEOMETRY not in ret['parks'][0]
    assert ret['total'] == 1
    assert ret['page'] == qry.DEFAULT_PAGE
    assert ret['per_page'] == qry.DEFAULT_PER_PAGE


def test_search_no_match(parks_db):
    ret = qry.search('yellowstone', db=parks_db)
    assert ret['parks'] == []
    assert ret['total'] == 0


def test_search_by_borough(parks_db):
    # Every sample park has "Park" in its name, three are in Manhattan.
    ret = qry.search('park', borough='m', db=parks_db)
    assert set(ids(ret['parks'])) == {CENTRAL_PARK, BRYANT_PARK,
                                      WASHINGTON_SQ}
    assert ret['total'] == 3


def test_search_by_type_and_min_acres(parks_db):
    ret = qry.search('park', park_type='Flagship Park', min_acres=600,
                     db=parks_db)
    assert set(ids(ret['parks'])) == {CENTRAL_PARK, 'Q099'}
    assert ret['total'] == 2


def test_search_paging(parks_db):
    first = qry.search('park', per_page=4, db=parks_db)
    second = qry.search('park', page=2, per_page=4, db=parks_db)
    assert first['total'] == second['total'] == NUM_SAMPLE_PARKS
    assert len(first['parks']) == 4
    assert len(second['parks']) == NUM_SAMPLE_PARKS - 4
    assert not set(ids(first['parks'])) & set(ids(second['parks']))


def test_search_ties_sorted_by_name(parks_db):
    # Two-word names like "Bryant Park" all score the same for "park".
    ret = qry.search('park', db=parks_db)
    scores = [park[qry.dbc.SCORE_FIELD] for park in ret['parks']]
    assert scores == sorted(scores, reverse=True)
    for prev, park in zip(ret['parks'], ret['parks'][1:]):
        if prev[qry.dbc.SCORE_FIELD] == park[qry.dbc.SCORE_FIELD]:
            assert prev[qry.NAME] <= park[qry.NAME]


def test_search_page_past_end(parks_db):
    ret = qry.search('central', page=2, db=parks_db)
    assert ret['parks'] == []
    assert ret['total'] == 1


@pytest.mark.parametrize('kwargs', [
    {'page': 0},
    {'per_page': 0},
    {'per_page': qry.MAX_PER_PAGE + 1},
    {'borough': 'Z'},
    {'min_acres': -1},
])
def test_search_bad_args_rejected_before_db(monkeypatch, kwargs):
    def unexpected_connection():
        pytest.fail('Invalid arguments should be rejected before connecting.')

    monkeypatch.setattr(qry.dbc, 'connect_db', unexpected_connection)
    with pytest.raises(ValueError):
        qry.search('central', **kwargs)


def test_search_empty():
    with pytest.raises(ValueError):
        qry.search('  ')


def test_near_inside_park(parks_db):
    ret = qry.near(*BETHESDA_TERRACE, db=parks_db)
    assert ret[0][qry.ID] == CENTRAL_PARK
    assert ret[0][qry.DISTANCE] == pytest.approx(0, abs=1)


def test_near_measures_to_edge(parks_db):
    ret = qry.near(*TIMES_SQUARE, radius=1000, db=parks_db)
    assert ret[0][qry.ID] == BRYANT_PARK
    # Times Square is a few hundred meters from Bryant Park's edge.
    assert 100 < ret[0][qry.DISTANCE] < 1000
    distances = [park[qry.DISTANCE] for park in ret]
    assert distances == sorted(distances)
    for park in ret:
        assert qry.GEOMETRY not in park


def test_near_nothing_in_radius(parks_db):
    assert qry.near(*OUT_AT_SEA, radius=1000, db=parks_db) == []


@pytest.mark.parametrize('lat, lng, radius', [
    (91, -73.9, 1000),
    (40.7, -181, 1000),
    (40.7, -73.9, 0),
    (40.7, -73.9, qry.MAX_RADIUS_M + 1),
])
def test_near_bad_args(lat, lng, radius):
    with pytest.raises(ValueError):
        qry.near(lat, lng, radius)


def test_at_central_park(parks_db):
    assert ids(qry.at(*BETHESDA_TERRACE, db=parks_db)) == [CENTRAL_PARK]


def test_at_washington_square(parks_db):
    assert ids(qry.at(*WASHINGTON_SQ_ARCH, db=parks_db)) == [WASHINGTON_SQ]


def test_at_no_park(parks_db):
    assert qry.at(*TIMES_SQUARE, db=parks_db) == []


def test_at_bad_coords():
    with pytest.raises(ValueError):
        qry.at(40.7, 200)


@pytest.mark.parametrize('limit', [1, 50])
def test_check_limit_valid(limit):
    qry.check_limit(limit)


@pytest.mark.parametrize('limit', [0, -1, 1.5, '5', None, True])
def test_check_limit_invalid(limit):
    with pytest.raises(ValueError, match='Limit must be a positive integer'):
        qry.check_limit(limit)


@pytest.mark.parametrize('limit', [0, -1, 1.5, '5', None, True])
def test_invalid_limit_rejected_before_db(monkeypatch, limit):
    def unexpected_connection():
        pytest.fail('Invalid limit should be rejected before connecting.')

    monkeypatch.setattr(qry.dbc, 'connect_db', unexpected_connection)

    with pytest.raises(ValueError, match='Limit must be a positive integer'):
        qry.near(*TIMES_SQUARE, limit=limit)


def acres(parks):
    return [park[qry.ACRES] for park in parks]


def test_get_parks_sorted_by_name_by_default(parks_db):
    ret = qry.get_parks(db=parks_db)
    assert ret['sort'] == qry.SORT_NAME
    names = [park[qry.NAME] for park in ret['parks']]
    assert names == sorted(names)


def test_get_parks_largest_first(parks_db):
    ret = qry.get_parks(sort=qry.SORT_LARGEST, db=parks_db)
    assert ret['sort'] == qry.SORT_LARGEST
    assert acres(ret['parks']) == sorted(acres(ret['parks']), reverse=True)
    # Flushing Meadows Corona Park (870.761 acres) beats Central Park.
    assert ids(ret['parks'])[:2] == ['Q099', CENTRAL_PARK]


def test_get_parks_smallest_first(parks_db):
    ret = qry.get_parks(sort=qry.SORT_SMALLEST, db=parks_db)
    assert acres(ret['parks']) == sorted(acres(ret['parks']))
    assert ids(ret['parks'])[0] == 'X247'  # Fox Park, 0.94 acres


def test_get_parks_sort_pages_do_not_overlap(parks_db):
    first = qry.get_parks(sort=qry.SORT_LARGEST, per_page=3, db=parks_db)
    second = qry.get_parks(sort=qry.SORT_LARGEST, page=2, per_page=3,
                           db=parks_db)
    assert min(acres(first['parks'])) >= max(acres(second['parks']))
    assert not set(ids(first['parks'])) & set(ids(second['parks']))


def test_get_parks_sort_with_filter(parks_db):
    ret = qry.get_parks(borough='M', sort=qry.SORT_SMALLEST, db=parks_db)
    assert ids(ret['parks']) == [BRYANT_PARK, WASHINGTON_SQ, CENTRAL_PARK]


@pytest.mark.parametrize('sort', ['sideways', '', 'NAME'])
def test_get_parks_bad_sort(sort):
    with pytest.raises(ValueError, match='Sort must be one of'):
        qry.get_parks(sort=sort)


def test_get_sort_none_means_default():
    assert qry.get_sort(None) == qry.SORTS[qry.DEFAULT_SORT]
