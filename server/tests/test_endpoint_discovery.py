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
