"""Bound search input before any database access."""
from unittest.mock import patch

import pytest

import parks.query as qry
import server.endpoints as ep


@patch('parks.query.dbc.connect_db')
def test_search_rejects_overlong_text_before_db(mock_connect):
    with pytest.raises(ValueError, match='at most 200 characters'):
        qry.search('x' * (qry.MAX_SEARCH_TEXT_LEN + 1))
    mock_connect.assert_not_called()


@patch('parks.query.dbc.connect_db')
def test_overlong_search_returns_400(mock_connect):
    response = ep.app.test_client().get(ep.SEARCH_EP, query_string={
        'text': 'x' * (qry.MAX_SEARCH_TEXT_LEN + 1),
    })
    assert response.status_code == 400
    assert 'at most 200 characters' in response.get_json()['message']
    mock_connect.assert_not_called()


@pytest.mark.parametrize('length', [1, qry.MAX_SEARCH_TEXT_LEN])
@patch('parks.query.dbc.text_search')
@patch('parks.query.dbc.connect_db')
def test_search_accepts_text_up_to_limit(mock_connect, mock_search, length):
    text = 'x' * length
    parks = [{'_id': 'M008', 'name': 'Bryant Park'}]
    mock_search.return_value = parks

    response = ep.app.test_client().get(
        ep.SEARCH_EP, query_string={'text': text},
    )

    assert response.status_code == 200
    assert response.get_json() == parks
    mock_connect.assert_called_once_with()
    mock_search.assert_called_once_with(
        qry.PARKS_COLLECT, text, db=qry.dbc.SE_DB,
        projection=qry.NO_GEOMETRY, limit=qry.DEFAULT_LIMIT,
    )
