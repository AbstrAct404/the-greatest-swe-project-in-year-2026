"""
Shared fixtures for the parks tests.
These run against a real MongoDB, since mongomock does not support
$geoNear properly.
"""
import json
import os

import pytest

import data.db_connect as dbc
import parks.query as qry

TEST_DB = 'testDB'

# Real parks from the NYC Parks Properties dataset, already cleaned
# into our document shape: M010 Central Park, B073 Prospect Park,
# M008 Bryant Park, M098 Washington Square Park, R015 Walker Park,
# Q099 Flushing Meadows Corona Park and X247 Fox Park.
SAMPLE_FILE = os.path.join(os.path.dirname(__file__), 'sample_parks.json')


@pytest.fixture
def sample_parks():
    with open(SAMPLE_FILE) as f:
        return json.load(f)


@pytest.fixture
def parks_db(sample_parks):
    """
    Load the sample parks into a test database, then drop it afterwards.
    """
    dbc.connect_db()
    dbc.client[TEST_DB][qry.PARKS_COLLECT].drop()
    dbc.client[TEST_DB][qry.PARKS_COLLECT].insert_many(sample_parks)
    qry.create_indexes(db=TEST_DB)
    yield TEST_DB
    dbc.client[TEST_DB][qry.PARKS_COLLECT].drop()
