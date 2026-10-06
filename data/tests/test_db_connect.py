"""
Tests for db_connect. These run against a real MongoDB,
since mongomock does not support $geoNear properly.
"""
import pytest

import data.db_connect as dbc

TEST_DB = 'testDB'
TEST_COLLECT = 'geo_test'
GEOM = 'geometry'
NAME = 'name'

# Two small squares (about 1 km wide), [lng, lat] order.
WEST_SQUARE = {
    dbc.MONGO_ID: 'W1',
    NAME: 'West Square',
    GEOM: {'type': 'Polygon', 'coordinates': [[
        [-74.00, 40.70], [-73.99, 40.70], [-73.99, 40.71],
        [-74.00, 40.71], [-74.00, 40.70],
    ]]},
}
EAST_SQUARE = {
    dbc.MONGO_ID: 'E1',
    NAME: 'East Square',
    GEOM: {'type': 'Polygon', 'coordinates': [[
        [-73.95, 40.70], [-73.94, 40.70], [-73.94, 40.71],
        [-73.95, 40.71], [-73.95, 40.70],
    ]]},
}
INSIDE_WEST = (-73.995, 40.705)
BETWEEN = (-73.98, 40.705)
FAR_AWAY = (-80.0, 30.0)


@pytest.fixture
def geo_collect():
    dbc.connect_db()
    dbc.client[TEST_DB][TEST_COLLECT].drop()
    for doc in (WEST_SQUARE, EAST_SQUARE):
        dbc.create(TEST_COLLECT, dict(doc), db=TEST_DB)
    dbc.create_geo_index(TEST_COLLECT, GEOM, db=TEST_DB)
    dbc.create_text_index(TEST_COLLECT, NAME, db=TEST_DB)
    yield TEST_COLLECT
    dbc.client[TEST_DB][TEST_COLLECT].drop()


def test_is_db_up():
    assert dbc.is_db_up()


def test_is_db_up_when_down(monkeypatch):
    def fail(*args, **kwargs):
        raise dbc.pm.errors.ServerSelectionTimeoutError('down')
    monkeypatch.setattr(dbc.pm.database.Database, 'command', fail)
    assert not dbc.is_db_up()


def test_point():
    expected = {'type': 'Point', 'coordinates': [-73.9, 40.7]}
    assert dbc.point(-73.9, 40.7) == expected


def test_count(geo_collect):
    assert dbc.count(geo_collect, db=TEST_DB) == 2
    assert dbc.count(geo_collect, {NAME: 'East Square'}, db=TEST_DB) == 1


def test_read_many_paging(geo_collect):
    sort = [(dbc.MONGO_ID, dbc.pm.ASCENDING)]
    first = dbc.read_many(geo_collect, db=TEST_DB, sort=sort, limit=1)
    second = dbc.read_many(geo_collect, db=TEST_DB, sort=sort,
                           skip=1, limit=1)
    assert [d[dbc.MONGO_ID] for d in first] == ['E1']
    assert [d[dbc.MONGO_ID] for d in second] == ['W1']


def test_read_many_projection(geo_collect):
    docs = dbc.read_many(geo_collect, db=TEST_DB, projection={GEOM: 0})
    assert docs
    for doc in docs:
        assert GEOM not in doc


def test_text_search(geo_collect):
    docs = dbc.text_search(geo_collect, 'east', db=TEST_DB)
    assert [d[dbc.MONGO_ID] for d in docs] == ['E1']
    assert docs[0][dbc.SCORE_FIELD] > 0


def test_text_search_no_match(geo_collect):
    assert dbc.text_search(geo_collect, 'nowhere', db=TEST_DB) == []


def test_geo_near_sorted_by_distance(geo_collect):
    docs = dbc.geo_near(geo_collect, *BETWEEN, GEOM, db=TEST_DB)
    assert [d[dbc.MONGO_ID] for d in docs] == ['W1', 'E1']
    assert 0 < docs[0][dbc.DISTANCE_FIELD] < docs[1][dbc.DISTANCE_FIELD]


def test_geo_near_inside_is_zero(geo_collect):
    docs = dbc.geo_near(geo_collect, *INSIDE_WEST, GEOM, db=TEST_DB)
    assert docs[0][dbc.MONGO_ID] == 'W1'
    assert docs[0][dbc.DISTANCE_FIELD] == pytest.approx(0, abs=1)


def test_geo_near_max_distance(geo_collect):
    docs = dbc.geo_near(geo_collect, *FAR_AWAY, GEOM,
                        max_distance=1000, db=TEST_DB)
    assert docs == []


def test_geo_near_filter_and_projection(geo_collect):
    docs = dbc.geo_near(geo_collect, *BETWEEN, GEOM,
                        filt={NAME: 'East Square'},
                        projection={GEOM: 0}, db=TEST_DB)
    assert [d[dbc.MONGO_ID] for d in docs] == ['E1']
    assert GEOM not in docs[0]


def test_geo_intersects(geo_collect):
    docs = dbc.geo_intersects(geo_collect, *INSIDE_WEST, GEOM, db=TEST_DB)
    assert [d[dbc.MONGO_ID] for d in docs] == ['W1']


def test_geo_intersects_outside(geo_collect):
    assert dbc.geo_intersects(geo_collect, *BETWEEN, GEOM,
                              db=TEST_DB) == []
