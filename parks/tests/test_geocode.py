"""Tests for the NYC GeoSearch address lookup."""
import io
import json
import os
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse

import pytest

import parks.geocode as geo

TIMES_SQUARE = {
    'type': 'Feature',
    'geometry': {'type': 'Point', 'coordinates': [-73.98653, 40.7562]},
    'properties': {'label': 'TIMES SQUARE, New York, NY, USA'},
}


def geosearch_response(*features):
    """A fake GeoSearch reply, as urlopen would return it."""
    body = {'type': 'FeatureCollection', 'features': list(features)}
    return io.BytesIO(json.dumps(body).encode())


@pytest.fixture
def mock_urlopen():
    with patch('parks.geocode.urlopen') as mock:
        mock.return_value = geosearch_response(TIMES_SQUARE)
        yield mock


def test_geocode(mock_urlopen):
    assert geo.geocode('Times Square') == {
        geo.LAT: 40.7562,
        geo.LNG: -73.98653,
        geo.LABEL: 'TIMES SQUARE, New York, NY, USA',
    }


def test_geocode_request(mock_urlopen):
    geo.geocode('  Times Square  ')
    args, kwargs = mock_urlopen.call_args
    url = urlparse(args[0])
    assert f'{url.scheme}://{url.netloc}{url.path}' == geo.GEOSEARCH_URL
    assert parse_qs(url.query) == {'text': ['Times Square'], 'size': ['1']}
    assert kwargs['timeout'] == geo.TIMEOUT_SECS


def test_geocode_no_label_uses_address(mock_urlopen):
    mock_urlopen.return_value = geosearch_response(
        dict(TIMES_SQUARE, properties={}))
    assert geo.geocode('Times Square')[geo.LABEL] == 'Times Square'


def test_geocode_not_found(mock_urlopen):
    mock_urlopen.return_value = geosearch_response()
    with pytest.raises(geo.AddressNotFound, match='No match found'):
        geo.geocode('zzzzqqq')


@pytest.mark.parametrize('address', [None, '', '   ', 42,
                                     'x' * (geo.MAX_ADDRESS_LEN + 1)])
def test_geocode_bad_address(mock_urlopen, address):
    with pytest.raises(ValueError):
        geo.geocode(address)
    mock_urlopen.assert_not_called()


@pytest.mark.parametrize('error', [URLError('down'), TimeoutError('slow')])
def test_geocode_service_down(mock_urlopen, error):
    mock_urlopen.side_effect = error
    with pytest.raises(geo.GeocodeUnavailable):
        geo.geocode('Times Square')


def test_geocode_bad_json(mock_urlopen):
    mock_urlopen.return_value = io.BytesIO(b'<html>oops</html>')
    with pytest.raises(geo.GeocodeUnavailable):
        geo.geocode('Times Square')


def test_geocode_missing_geometry(mock_urlopen):
    mock_urlopen.return_value = geosearch_response({'properties': {}})
    with pytest.raises(geo.GeocodeUnavailable, match='unexpected'):
        geo.geocode('Times Square')


@pytest.mark.skipif(os.environ.get('RUN_LIVE_API_TESTS') != '1',
                    reason='Set RUN_LIVE_API_TESTS=1 to test live GeoSearch.')
def test_geocode_live():
    ret = geo.geocode('Times Square')
    assert ret[geo.LAT] == pytest.approx(40.756, abs=0.01)
    assert ret[geo.LNG] == pytest.approx(-73.986, abs=0.01)
