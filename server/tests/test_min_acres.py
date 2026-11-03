"""Reject nonfinite acreage filters before reaching MongoDB."""
from unittest.mock import patch

import pytest

import parks.query as qry
import server.endpoints as ep


@pytest.mark.parametrize('value', [float('nan'), float('inf'), -float('inf')])
@patch('parks.query.dbc.connect_db')
def test_get_parks_rejects_nonfinite_acres(mock_connect, value):
    with pytest.raises(ValueError, match='finite and nonnegative'):
        qry.get_parks(min_acres=value)
    mock_connect.assert_not_called()


@pytest.mark.parametrize('value', ['nan', 'inf', '-inf'])
@patch('parks.query.dbc.connect_db')
def test_nonfinite_min_acres_returns_400(mock_connect, value):
    response = ep.app.test_client().get(
        ep.PARKS_EP, query_string={'min_acres': value},
    )
    assert response.status_code == 400
    assert 'finite and nonnegative' in response.get_json()['message']
    mock_connect.assert_not_called()


@pytest.mark.parametrize('value', [0, 0.5, 100])
def test_finite_min_acres_remains_valid(value):
    assert qry.build_filter(min_acres=value) == {
        qry.ACRES: {'$gte': value},
    }
