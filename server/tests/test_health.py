"""Tests for the /health endpoint."""
from http.client import OK, SERVICE_UNAVAILABLE
from unittest.mock import patch

import server.endpoints as ep


@patch('server.endpoints.dbc.is_db_up', return_value=True)
def test_health_when_db_up(mock_db_up):
    resp = ep.app.test_client().get(ep.HEALTH_EP)
    assert resp.status_code == OK
    assert resp.get_json() == {ep.STATUS: ep.STATUS_OK,
                               ep.DATABASE: ep.DB_UP}
    mock_db_up.assert_called_once_with()


@patch('server.endpoints.dbc.is_db_up', return_value=False)
def test_health_when_db_down(mock_db_up):
    resp = ep.app.test_client().get(ep.HEALTH_EP)
    assert resp.status_code == SERVICE_UNAVAILABLE
    assert resp.get_json() == {ep.STATUS: ep.STATUS_DEGRADED,
                               ep.DATABASE: ep.DB_DOWN}


@patch('server.endpoints.dbc.is_db_up', return_value=True)
def test_health_is_not_rate_limited(mock_db_up):
    client = ep.app.test_client()
    environ_base = {'REMOTE_ADDR': '198.51.100.2'}
    # More requests than the hourly default limit allows:
    for _ in range(60):
        resp = client.get(ep.HEALTH_EP, environ_base=environ_base)
        assert resp.status_code == OK


def test_health_is_listed():
    resp = ep.app.test_client().get(ep.ENDPOINT_EP)
    assert ep.HEALTH_EP in resp.get_json()[ep.ENDPOINT_RESP]


def test_health_documented_in_swagger():
    resp = ep.app.test_client().get('/swagger.json')
    responses = resp.get_json()['paths'][ep.HEALTH_EP]['get']['responses']
    assert str(OK) in responses
    assert str(SERVICE_UNAVAILABLE) in responses
