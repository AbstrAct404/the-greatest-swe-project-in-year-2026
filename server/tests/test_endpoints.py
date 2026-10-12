from http.client import (
    BAD_REQUEST,
    FORBIDDEN,
    NOT_ACCEPTABLE,
    NOT_FOUND,
    OK,
    SERVICE_UNAVAILABLE,
)

from unittest.mock import patch

import pytest

import server.endpoints as ep

TEST_CLIENT = ep.app.test_client()


def test_hello():
    resp = TEST_CLIENT.get(ep.HELLO_EP)
    resp_json = resp.get_json()
    assert ep.HELLO_RESP in resp_json


@patch('server.endpoints.pqry.get_parks', autospec=True)
def test_get_parks(mock_get_parks):
    result = {'parks': [], 'total': 0, 'page': 2, 'per_page': 10}
    mock_get_parks.return_value = result

    resp = TEST_CLIENT.get(
        f'{ep.PARKS_EP}?borough=m&park_type=Garden&min_acres=1.5'
        '&page=2&per_page=10'
    )

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_get_parks.assert_called_once_with(
        borough='m', park_type='Garden', min_acres=1.5, page=2, per_page=10
    )


def test_get_parks_bad_query_parameter():
    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}?page=invalid')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.pqry.search', autospec=True)
def test_search_parks(mock_search):
    result = [{'_id': 'M010', 'name': 'Central Park'}]
    mock_search.return_value = result

    resp = TEST_CLIENT.get(f'{ep.SEARCH_EP}?text=central&limit=10')

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_search.assert_called_once_with('central', limit=10)


def test_search_parks_bad_query_parameter():
    resp = TEST_CLIENT.get(f'{ep.SEARCH_EP}?text=central&limit=invalid')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.pqry.near', autospec=True)
def test_get_nearby_parks(mock_near):
    result = [{'_id': 'M008', 'name': 'Bryant Park'}]
    mock_near.return_value = result

    resp = TEST_CLIENT.get(
        f'{ep.NEAR_EP}?lat=40.758&lng=-73.9855&radius=1200&limit=5'
    )

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_near.assert_called_once_with(40.758, -73.9855, radius=1200.0, limit=5)


def test_get_nearby_parks_bad_query_parameter():
    resp = TEST_CLIENT.get(f'{ep.NEAR_EP}?lat=40.7&lng=bad')
    assert resp.status_code == BAD_REQUEST


def test_get_nearby_parks_missing_coordinates():
    resp = TEST_CLIENT.get(f'{ep.NEAR_EP}?lat=40.7')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.pqry.at', autospec=True)
def test_get_parks_at_coordinates(mock_at):
    result = [{'_id': 'M010', 'name': 'Central Park'}]
    mock_at.return_value = result

    resp = TEST_CLIENT.get(f'{ep.AT_EP}?lat=40.774&lng=-73.9708')

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_at.assert_called_once_with(40.774, -73.9708)


def test_get_parks_at_coordinates_missing_coordinate():
    resp = TEST_CLIENT.get(f'{ep.AT_EP}?lng=-73.9708')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.pqry.get_park', autospec=True)
def test_get_park(mock_get_park):
    result = {'_id': 'M010', 'name': 'Central Park'}
    mock_get_park.return_value = result

    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}/M010')

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_get_park.assert_called_once_with('M010')


@patch('server.endpoints.pqry.get_park', return_value=None, autospec=True)
def test_get_park_not_found(mock_get_park):
    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}/MISSING')
    assert resp.status_code == NOT_FOUND


@pytest.mark.parametrize('limit', ['0', '-1'])
@pytest.mark.parametrize('path', [
    f'{ep.SEARCH_EP}?text=central',
    f'{ep.NEAR_EP}?lat=40.758&lng=-73.9855',
])
def test_invalid_result_limit_returns_bad_request(path, limit):
    resp = TEST_CLIENT.get(f'{path}&limit={limit}')
    assert resp.status_code == BAD_REQUEST
