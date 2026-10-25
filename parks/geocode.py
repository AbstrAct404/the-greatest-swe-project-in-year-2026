"""
Turn an NYC address or place name into coordinates, using NYC's
GeoSearch service (free, no API key): https://geosearch.planninglabs.nyc
"""
import json
import math
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

GEOSEARCH_URL = 'https://geosearch.planninglabs.nyc/v2/search'
TIMEOUT_SECS = 10
MAX_ADDRESS_LEN = 200

# Keys in the dict geocode() returns:
LAT = 'lat'
LNG = 'lng'
LABEL = 'label'


class AddressNotFound(ValueError):
    """GeoSearch has no match for the address."""


class GeocodeUnavailable(RuntimeError):
    """GeoSearch could not be reached or sent back something unusable."""


def check_address(address) -> str:
    """Return the trimmed address, or raise ValueError if it is unusable."""
    if not isinstance(address, str) or not address.strip():
        raise ValueError('Address cannot be empty.')
    address = address.strip()
    if len(address) > MAX_ADDRESS_LEN:
        raise ValueError(f'Address must be at most {MAX_ADDRESS_LEN} '
                         'characters.')
    return address


def fetch_matches(address: str) -> dict:
    """Ask GeoSearch for the best match. Returns its GeoJSON response."""
    params = urlencode({'text': address, 'size': 1})
    try:
        with urlopen(f'{GEOSEARCH_URL}?{params}',
                     timeout=TIMEOUT_SECS) as response:
            return json.load(response)
    except (URLError, TimeoutError, ValueError) as error:
        raise GeocodeUnavailable(
            f'Address lookup is unavailable: {error}') from error


def geocode(address) -> dict:
    """
    Return the best match for address as {lat, lng, label}.
    GeoSearch gives coordinates as [longitude, latitude].
    """
    address = check_address(address)
    response = fetch_matches(address)
    try:
        if not isinstance(response, dict):
            raise ValueError('Expected a response object.')
        features = response.get('features')
        if not isinstance(features, list):
            raise ValueError('Expected a features list.')
        if not features:
            raise AddressNotFound(f'No match found for "{address}".')
        feature = features[0]
        geometry = feature['geometry']
        if geometry.get('type') != 'Point':
            raise ValueError('Expected a point geometry.')
        coordinates = geometry['coordinates']
        if not isinstance(coordinates, list) or len(coordinates) < 2:
            raise ValueError('Expected longitude and latitude.')
        lng, lat = coordinates[:2]
        for value, bound in ((lng, 180), (lat, 90)):
            if (type(value) not in (int, float)
                    or not math.isfinite(value)
                    or not -bound <= value <= bound):
                raise ValueError('Invalid coordinate.')
        properties = feature.get('properties')
        label = properties.get(LABEL) if isinstance(properties, dict) else None
        if not isinstance(label, str) or not label.strip():
            label = address
    except AddressNotFound:
        raise
    except (KeyError, TypeError, ValueError, AttributeError,
            OverflowError) as error:
        raise GeocodeUnavailable(
            'Address lookup sent back an unexpected response.') from error
    return {LAT: lat, LNG: lng, LABEL: label}
