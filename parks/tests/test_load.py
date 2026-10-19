"""Tests for the NYC Parks data loader."""
import io
import json
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from shapely.geometry import shape

import data.db_connect as dbc
import parks.load as ld
import parks.query as qry
from parks.load import fetch_all_park_records, fetch_park_records
from parks.tests.conftest import TEST_DB

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


@patch("parks.load.fetch_park_records")
def test_fetch_all_park_records_multiple_pages(mock_fetch):
    mock_fetch.side_effect = [
        [{"objectid": "1"}],
        [{"objectid": "2"}],
        [],
    ]

    assert fetch_all_park_records() == [
        {"objectid": "1"},
        {"objectid": "2"},
    ]
    assert [
        call.kwargs for call in mock_fetch.call_args_list
    ] == [
        {"limit": 100, "offset": 0},
        {"limit": 100, "offset": 100},
        {"limit": 100, "offset": 200},
    ]


# A small square park, [lng, lat] order, in the API's raw field names.
SQUARE = [[[-74.00, 40.70], [-73.99, 40.70], [-73.99, 40.71],
           [-74.00, 40.71], [-74.00, 40.70]]]
# A "bowtie": its edges cross, so it is invalid and MongoDB rejects it.
BOWTIE = [[[-74.00, 40.70], [-73.99, 40.71], [-73.99, 40.70],
           [-74.00, 40.71], [-74.00, 40.70]]]


def raw_park(park_id='M999', coords=SQUARE, **changes):
    record = {
        ld.RAW_ID: park_id,
        ld.RAW_NAME: 'Test Park',
        ld.RAW_TYPE: 'Neighborhood Park',
        ld.RAW_BOROUGH: 'M',
        ld.RAW_ACRES: '0.351',
        ld.RAW_ADDRESS: '1 Test St',
        ld.RAW_ZIPCODE: '10001',
        ld.RAW_WATERFRONT: False,
        ld.RAW_RETIRED: False,
        ld.RAW_GEOMETRY: {'type': 'MultiPolygon', 'coordinates': [coords]},
    }
    record.update(changes)
    return record


@pytest.mark.parametrize('value, expected', [
    (True, True), (False, False), ('true', True), ('False', False),
    (None, False),
])
def test_to_bool(value, expected):
    assert ld.to_bool(value) is expected


@pytest.mark.parametrize('value, expected', [
    ('0.351', 0.351), ('840.01', 840.01), ('', None), (None, None),
])
def test_to_acres(value, expected):
    assert ld.to_acres(value) == expected


def test_clean_park():
    park = ld.clean_park(raw_park())
    assert park[qry.ID] == 'M999'
    assert park[qry.NAME] == 'Test Park'
    assert park[qry.TYPE] == 'Neighborhood Park'
    assert park[qry.ACRES] == 0.351
    assert park[qry.WATERFRONT] is False
    assert park[qry.GEOMETRY]['type'] == 'MultiPolygon'
    assert ld.RAW_NAME not in park
    assert ld.RAW_GEOMETRY not in park


def test_clean_park_centroid_is_lng_lat():
    lng, lat = ld.clean_park(raw_park())[qry.CENTROID]['coordinates']
    assert lng == pytest.approx(-73.995)
    assert lat == pytest.approx(40.705)


def test_clean_park_fixes_invalid_shape():
    assert not shape({'type': 'Polygon', 'coordinates': BOWTIE}).is_valid
    park = ld.clean_park(raw_park(coords=BOWTIE))
    assert park is not None
    assert shape(park[qry.GEOMETRY]).is_valid


def test_clean_park_drops_retired():
    assert ld.clean_park(raw_park(retired=True)) is None


def test_clean_park_drops_missing_boundary():
    assert ld.clean_park(raw_park(multipolygon=None)) is None


def test_clean_park_drops_missing_id():
    assert ld.clean_park(raw_park(park_id=None)) is None


def test_clean_parks():
    records = [raw_park('M1'), raw_park('M2', retired=True), raw_park('M3')]
    assert [p[qry.ID] for p in ld.clean_parks(records)] == ['M1', 'M3']


@pytest.fixture
def empty_db():
    dbc.connect_db()
    dbc.client[TEST_DB][qry.PARKS_COLLECT].drop()
    yield TEST_DB
    dbc.client[TEST_DB][qry.PARKS_COLLECT].drop()


def test_load_parks(empty_db):
    records = [raw_park('M1'), raw_park('M2', coords=BOWTIE),
               raw_park('M3', retired=True)]
    ret = ld.load_parks(records, db=empty_db)
    assert ret == {'fetched': 3, 'loaded': 2, 'skipped': 1, 'changed': 2}
    assert qry.get_park('M2', db=empty_db) is not None
    # The loaded parks work with the geo queries:
    assert [p[qry.ID] for p in qry.at(40.705, -73.995, db=empty_db)]


def test_load_parks_twice_does_not_duplicate(empty_db):
    ld.load_parks([raw_park('M1')], db=empty_db)
    ret = ld.load_parks([raw_park('M1', signname='New Name')], db=empty_db)
    assert ret['changed'] == 1
    assert qry.get_parks(db=empty_db)['total'] == 1
    assert qry.get_park('M1', db=empty_db)[qry.NAME] == 'New Name'


@patch("parks.load.fetch_all_park_records")
def test_load_parks_fetches_by_default(mock_fetch, empty_db):
    mock_fetch.return_value = [raw_park('M1')]
    assert ld.load_parks(db=empty_db)['loaded'] == 1
    mock_fetch.assert_called_once()


@patch('parks.load.urlopen')
def test_fetch_park_records_timeout(mock_urlopen):
    error = TimeoutError('NYC Parks API timed out')
    mock_urlopen.side_effect = error

    with pytest.raises(TimeoutError, match='NYC Parks API timed out') as exc:
        fetch_park_records()

    assert exc.value is error
    mock_urlopen.assert_called_once()
    assert mock_urlopen.call_args.kwargs['timeout'] == 15


@patch('parks.load.MAX_PAGES', 3)
@patch('parks.load.fetch_park_records')
def test_fetch_all_park_records_page_limit(mock_fetch):
    mock_fetch.return_value = [{'objectid': '1'}]

    with pytest.raises(RuntimeError,
                       match='Maximum number of API pages exceeded'):
        fetch_all_park_records()

    assert [call.kwargs for call in mock_fetch.call_args_list] == [
        {'limit': ld.DEFAULT_LIMIT,
         'offset': ld.DEFAULT_OFFSET + page * ld.DEFAULT_LIMIT}
        for page in range(3)
    ]


def test_live_parks_api():
    """Optional smoke test against the real NYC Open Data service."""
    import os

    if os.environ.get('RUN_LIVE_API_TESTS') != '1':
        pytest.skip('Set RUN_LIVE_API_TESTS=1 to test the live NYC Parks API.')

    records = fetch_park_records(limit=1, offset=0)

    assert isinstance(records, list)
    assert len(records) == 1
    assert records[0].get('gispropnum')
