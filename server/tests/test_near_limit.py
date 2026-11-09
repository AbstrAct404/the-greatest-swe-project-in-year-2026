"""Check the nearby result cap at the HTTP and database boundaries."""
from unittest.mock import patch

from server.endpoints import NEAR_EP, app


@patch('parks.query.dbc.connect_db')
def test_near_limit_over_cap_returns_400_before_db(connect):
    response = app.test_client().get(
        NEAR_EP, query_string={'lat': 40.7, 'lng': -74, 'limit': 501},
    )

    assert response.status_code == 400
    assert 'at most 500' in response.get_json()['message']
    connect.assert_not_called()


@patch('parks.query.dbc.geo_near', return_value=[])
@patch('parks.query.dbc.connect_db')
def test_near_limit_at_cap_reaches_db(connect, geo_near):
    response = app.test_client().get(
        NEAR_EP, query_string={'lat': 40.7, 'lng': -74, 'limit': 500},
    )

    assert response.status_code == 200
    assert response.get_json() == []
    connect.assert_called_once()
    geo_near.assert_called_once()
    assert geo_near.call_args.kwargs['limit'] == 500
