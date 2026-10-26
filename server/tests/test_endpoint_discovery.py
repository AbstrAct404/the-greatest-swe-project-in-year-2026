"""Use a shared pytest fixture to check the API's route directory."""
import pytest

import server.endpoints as ep


@pytest.fixture
def api_client():
    """Provide a fresh Flask client and close its context after each test."""
    with ep.app.test_client() as client:
        yield client


def test_endpoint_directory_lists_park_routes(api_client):
    response = api_client.get('/endpoints')

    assert response.status_code == 200
    routes = response.get_json()['Available endpoints']
    assert {
        '/parks', '/parks/<string:park_id>',
        '/parks/search', '/parks/near', '/parks/at',
    }.issubset(routes)


def test_endpoint_directory_is_sorted(api_client):
    response = api_client.get('/endpoints')

    assert response.status_code == 200
    routes = response.get_json()['Available endpoints']
    assert isinstance(routes, list)
    assert all(isinstance(route, str) for route in routes)
    assert routes == sorted(routes)


def test_swagger_documents_query_parameters(api_client):
    response = api_client.get('/swagger.json')

    assert response.status_code == 200
    paths = response.get_json()['paths']
    expected = {
        '/geocode': {'address': True},
        '/parks': {
            'borough': False, 'park_type': False, 'min_acres': False,
            'page': False, 'per_page': False,
        },
        '/parks/at': {'lat': True, 'lng': True},
        '/parks/near': {
            'lat': True, 'lng': True, 'radius': False, 'limit': False,
        },
        '/parks/search': {'text': True, 'limit': False},
    }

    for path, parameters in expected.items():
        operation_parameters = paths[path]['get']['parameters']
        documented = {
            parameter['name']: parameter
            for parameter in operation_parameters
            if parameter['in'] == 'query'
        }
        for name, required in parameters.items():
            assert name in documented
            assert documented[name].get('required', False) is required
