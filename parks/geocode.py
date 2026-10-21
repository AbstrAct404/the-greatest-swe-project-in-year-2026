"""
Turn an NYC address or place name into coordinates, using NYC's
GeoSearch service (free, no API key): https://geosearch.planninglabs.nyc
"""
import json
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
    features = fetch_matches(address).get('features') or []
    if not features:
        raise AddressNotFound(f'No match found for "{address}".')
    feature = features[0]
    try:
        lng, lat = feature['geometry']['coordinates'][:2]
    except (KeyError, TypeError, ValueError) as error:
        raise GeocodeUnavailable(
            'Address lookup sent back an unexpected response.') from error
    label = feature.get('properties', {}).get(LABEL, address)
    return {LAT: lat, LNG: lng, LABEL: label}
