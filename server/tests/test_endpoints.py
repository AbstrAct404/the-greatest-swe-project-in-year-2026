from http.client import (
    BAD_REQUEST,
    NOT_FOUND,
    OK,
    SERVICE_UNAVAILABLE,
    TOO_MANY_REQUESTS,
)

from unittest.mock import patch

import pytest

import server.endpoints as ep

TEST_CLIENT = ep.app.test_client()


def test_default_rate_limit_applies_per_client_ip():
    client = ep.app.test_client()
    environ_base = {'REMOTE_ADDR': '198.51.100.1'}

    for _ in range(50):
        response = client.get(ep.ENDPOINT_EP, environ_base=environ_base)
        assert response.status_code == OK

    response = client.get(ep.ENDPOINT_EP, environ_base=environ_base)
    assert response.status_code == TOO_MANY_REQUESTS


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
        borough='m', park_type='Garden', min_acres=1.5, page=2, per_page=10,
        sort=ep.pqry.DEFAULT_SORT,
    )


def test_get_parks_bad_query_parameter():
    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}?page=invalid')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.pqry.search', autospec=True)
def test_search_parks(mock_search):
    result = {'parks': [{'_id': 'M010', 'name': 'Central Park'}],
              'total': 1, 'page': 1, 'per_page': 50}
    mock_search.return_value = result

    resp = TEST_CLIENT.get(f'{ep.SEARCH_EP}?text=central')

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_search.assert_called_once_with(
        'central', borough=None, park_type=None, min_acres=None,
        page=ep.pqry.DEFAULT_PAGE, per_page=ep.pqry.DEFAULT_PER_PAGE,
    )


@patch('server.endpoints.pqry.search', autospec=True)
def test_search_parks_with_filters_and_paging(mock_search):
    mock_search.return_value = {'parks': [], 'total': 0, 'page': 2,
                                'per_page': 10}

    resp = TEST_CLIENT.get(ep.SEARCH_EP, query_string={
        'text': 'park', 'borough': 'M', 'park_type': 'Flagship Park',
        'min_acres': '5.5', 'page': '2', 'per_page': '10',
    })

    assert resp.status_code == OK
    mock_search.assert_called_once_with(
        'park', borough='M', park_type='Flagship Park', min_acres=5.5,
        page=2, per_page=10,
    )


@pytest.mark.parametrize('param', ['page', 'per_page', 'min_acres'])
def test_search_parks_bad_query_parameter(param):
    resp = TEST_CLIENT.get(ep.SEARCH_EP, query_string={
        'text': 'central', param: 'invalid',
    })
    assert resp.status_code == BAD_REQUEST


@patch('parks.query.dbc.connect_db')
def test_search_parks_bad_borough(mock_connect):
    resp = TEST_CLIENT.get(ep.SEARCH_EP, query_string={
        'text': 'central', 'borough': 'Z',
    })
    assert resp.status_code == BAD_REQUEST
    assert 'Borough must be one of' in resp.get_json()['message']
    mock_connect.assert_not_called()


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
@pytest.mark.parametrize('path, param', [
    (f'{ep.SEARCH_EP}?text=central', 'per_page'),
    (f'{ep.NEAR_EP}?lat=40.758&lng=-73.9855', 'limit'),
])
def test_invalid_result_limit_returns_bad_request(path, param, limit):
    resp = TEST_CLIENT.get(f'{path}&{param}={limit}')
    assert resp.status_code == BAD_REQUEST


@patch('server.endpoints.geo.geocode', autospec=True)
def test_geocode(mock_geocode):
    result = {'lat': 40.7562, 'lng': -73.98653,
              'label': 'TIMES SQUARE, New York, NY, USA'}
    mock_geocode.return_value = result

    resp = TEST_CLIENT.get(f'{ep.GEOCODE_EP}?address=Times Square')

    assert resp.status_code == OK
    assert resp.get_json() == result
    mock_geocode.assert_called_once_with('Times Square')


@pytest.mark.parametrize('error, status', [
    (ep.geo.AddressNotFound('No match'), NOT_FOUND),
    (ValueError('Address cannot be empty.'), BAD_REQUEST),
])
@patch('server.endpoints.geo.geocode', autospec=True)
def test_geocode_errors(mock_geocode, error, status):
    mock_geocode.side_effect = error
    resp = TEST_CLIENT.get(f'{ep.GEOCODE_EP}?address=somewhere')
    assert resp.status_code == status
    assert resp.get_json()['message'] == str(error)


@pytest.mark.parametrize('response, status', [
    ([], SERVICE_UNAVAILABLE),
    ({'features': [{'geometry': {
        'type': 'Point', 'coordinates': ['bad', 40.7],
    }}]}, SERVICE_UNAVAILABLE),
    ({'features': []}, NOT_FOUND),
])
@patch('parks.geocode.fetch_matches')
def test_geocode_upstream_response_status(mock_fetch, response, status):
    mock_fetch.return_value = response
    resp = TEST_CLIENT.get(f'{ep.GEOCODE_EP}?address=Times Square')
    assert resp.status_code == status


@patch('server.endpoints.pqry.get_parks', autospec=True)
def test_get_parks_sorted(mock_get_parks):
    mock_get_parks.return_value = {'parks': [], 'total': 0, 'page': 1,
                                   'per_page': 50, 'sort': 'largest'}

    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}?sort=largest')

    assert resp.status_code == OK
    assert mock_get_parks.call_args.kwargs['sort'] == 'largest'


def test_get_parks_bad_sort():
    resp = TEST_CLIENT.get(f'{ep.PARKS_EP}?sort=sideways')
    assert resp.status_code == BAD_REQUEST
    assert 'Sort must be one of' in resp.get_json()['message']


@patch('server.endpoints.geo.geocode', autospec=True)
def test_geocode_unavailable_hides_internal_details(mock_geocode, caplog):
    internal_detail = 'upstream connection refused'
    mock_geocode.side_effect = ep.geo.GeocodeUnavailable(internal_detail)

    resp = TEST_CLIENT.get(
        ep.GEOCODE_EP, query_string={'address': 'somewhere'},
    )

    assert resp.status_code == SERVICE_UNAVAILABLE
    assert resp.get_json()['message'] == (
        'Address lookup is temporarily unavailable.'
    )
    assert internal_detail not in resp.get_data(as_text=True)
    assert internal_detail in caplog.text
