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
