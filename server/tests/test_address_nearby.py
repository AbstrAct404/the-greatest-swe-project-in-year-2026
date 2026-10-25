"""Exercise address lookup and nearby queries through real HTTP routes."""
import io
import json
from unittest.mock import patch

import pytest

import parks.query as qry
import server.endpoints as ep

LAT = 40.7562
LNG = -73.98653
LABEL = 'Times Square, Manhattan'


@pytest.fixture
def nearby_services():
    """Mock only external HTTP and database boundaries, not app logic."""
    response = {'features': [{
        'geometry': {'type': 'Point', 'coordinates': [LNG, LAT]},
        'properties': {'label': LABEL},
    }]}
    with patch('parks.geocode.urlopen') as http, \
            patch('parks.query.dbc.connect_db') as connect, \
            patch('parks.query.dbc.geo_near') as near:
        http.return_value = io.BytesIO(json.dumps(response).encode())
        yield http, connect, near


@pytest.mark.parametrize('parks', [
    [],
    [{'_id': 'M008', 'name': 'Bryant Park', 'distance': 450.0}],
])
@pytest.mark.parametrize('options, radius, limit', [
    ({}, qry.DEFAULT_RADIUS_M, qry.DEFAULT_LIMIT),
    ({'radius': 1500, 'limit': 10}, 1500.0, 10),
])
def test_address_to_nearby_parks(nearby_services, parks, options,
                                 radius, limit):
    """Preserve coordinates, query options and results across both requests."""
    http, connect, near = nearby_services
    near.return_value = parks
    client = ep.app.test_client()

    lookup = client.get(ep.GEOCODE_EP,
                        query_string={'address': 'Times Square'})
    assert lookup.status_code == 200
    place = lookup.get_json()
    assert place == {'lat': LAT, 'lng': LNG, 'label': LABEL}
    http.assert_called_once()
    connect.assert_not_called()
    near.assert_not_called()

    result = client.get(ep.NEAR_EP, query_string={
        'lat': place['lat'], 'lng': place['lng'], **options,
    })

    assert result.status_code == 200
    assert result.get_json() == parks
    connect.assert_called_once_with()
    # HTTP uses lat/lng; MongoDB requires longitude before latitude.
    near.assert_called_once_with(
        qry.PARKS_COLLECT, LNG, LAT, qry.GEOMETRY,
        max_distance=radius, db=qry.dbc.SE_DB,
        projection=qry.NO_GEOMETRY, limit=limit,
    )
