"""
This is the file containing all of the endpoints for our flask app.
The endpoint called `endpoints` will return all available endpoints.
"""
from http import HTTPStatus

from flask import Flask, request
from flask_restx import Resource, Api  # , fields  # Namespace
from flask_cors import CORS

import werkzeug.exceptions as wz

import parks.geocode as geo
import parks.query as pqry

app = Flask(__name__)
# Don't append "did you mean ..." route hints to our 404 messages.
app.config['RESTX_ERROR_404_HELP'] = False
CORS(app)
api = Api(app)

ENDPOINT_EP = '/endpoints'
ENDPOINT_RESP = 'Available endpoints'
HELLO_EP = '/hello'
HELLO_RESP = 'hello'
PARKS_EP = '/parks'
PARK_EP = '/parks/<string:park_id>'
SEARCH_EP = '/parks/search'
NEAR_EP = '/parks/near'
AT_EP = '/parks/at'
GEOCODE_EP = '/geocode'
MESSAGE = 'Message'


def _get_coordinates(args):
    """Parse required latitude and longitude query parameters."""
    if 'lat' not in args or 'lng' not in args:
        raise wz.BadRequest(
            description='Latitude and longitude are required.'
        )
    try:
        return float(args['lat']), float(args['lng'])
    except ValueError as error:
        raise wz.BadRequest(description=str(error)) from error


@api.route(HELLO_EP)
class HelloWorld(Resource):
    """
    The purpose of the HelloWorld class is to have a simple test to see if the
    app is working at all.
    """
    def get(self):
        """
        A trivial endpoint to see if the server is running.
        """
        return {HELLO_RESP: 'world'}


@api.route(ENDPOINT_EP)
class Endpoints(Resource):
    """
    This class will serve as live, fetchable documentation of what endpoints
    are available in the system.
    """
    def get(self):
        """
        The `get()` method will return a sorted list of available endpoints.
        """
        endpoints = sorted(rule.rule for rule in api.app.url_map.iter_rules())
        return {"Available endpoints": endpoints}


@api.route(PARKS_EP)
class Parks(Resource):
    """List parks with optional filters and pagination."""

    @api.doc(params={
        'borough': {'description': 'Borough code: B, M, Q, R, or X.',
                    'in': 'query', 'type': 'string'},
        'park_type': {'description': 'Park type.',
                      'in': 'query', 'type': 'string'},
        'min_acres': {'description': 'Minimum park size in acres.',
                      'in': 'query', 'type': 'number'},
        'page': {'description': 'Page number, starting at 1.',
                 'in': 'query', 'type': 'integer'},
        'per_page': {'description': 'Results per page.',
                     'in': 'query', 'type': 'integer'},
        'sort': {'description': 'Order: name (default), largest or '
                                'smallest.',
                 'in': 'query', 'type': 'string',
                 'enum': sorted(pqry.SORTS)},
    })
    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Invalid query parameter')
    def get(self):
        """Return a page of parks with optional filters and pagination."""
        try:
            args = request.args
            min_acres = args.get('min_acres')
            page = args.get('page')
            per_page = args.get('per_page')
            parks = pqry.get_parks(
                borough=args.get('borough'),
                park_type=args.get('park_type'),
                min_acres=float(min_acres) if min_acres is not None else None,
                page=int(page) if page is not None else pqry.DEFAULT_PAGE,
                per_page=(int(per_page) if per_page is not None
                          else pqry.DEFAULT_PER_PAGE),
                sort=args.get('sort', pqry.DEFAULT_SORT),
            )
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        return parks


@api.route(SEARCH_EP)
class Search(Resource):
    """Search parks by text."""

    @api.doc(params={
        'text': {'description': 'Text to search for in park names.',
                 'in': 'query', 'required': True, 'type': 'string'},
        'limit': {'description': 'Maximum number of results.',
                  'in': 'query', 'type': 'integer'},
    })
    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Invalid query parameter')
    def get(self):
        """Return parks whose names match the search text."""
        try:
            text = request.args.get('text')
            limit = request.args.get('limit')
            parks = pqry.search(
                text,
                limit=int(limit) if limit is not None else pqry.DEFAULT_LIMIT,
            )
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        return parks


@api.route(NEAR_EP)
class Near(Resource):
    """Find parks near a geographic point."""

    @api.doc(params={
        'lat': {'description': 'Latitude in decimal degrees.',
                'in': 'query', 'required': True, 'type': 'number'},
        'lng': {'description': 'Longitude in decimal degrees.',
                'in': 'query', 'required': True, 'type': 'number'},
        'radius': {'description': 'Search radius in meters.',
                   'in': 'query', 'type': 'number'},
        'limit': {'description': 'Maximum number of results.',
                  'in': 'query', 'type': 'integer'},
    })
    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Invalid query parameter')
    def get(self):
        """Return parks within a radius of the supplied coordinates."""
        lat, lng = _get_coordinates(request.args)
        try:
            radius = request.args.get('radius')
            limit = request.args.get('limit')
            parks = pqry.near(
                lat,
                lng,
                radius=float(radius) if radius is not None
                else pqry.DEFAULT_RADIUS_M,
                limit=int(limit) if limit is not None else pqry.DEFAULT_LIMIT,
            )
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        return parks


@api.route(AT_EP)
class At(Resource):
    """Find parks containing a geographic point."""

    @api.doc(params={
        'lat': {'description': 'Latitude in decimal degrees.',
                'in': 'query', 'required': True, 'type': 'number'},
        'lng': {'description': 'Longitude in decimal degrees.',
                'in': 'query', 'required': True, 'type': 'number'},
    })
    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Invalid query parameter')
    def get(self):
        """Return parks containing the supplied coordinates."""
        lat, lng = _get_coordinates(request.args)
        try:
            parks = pqry.at(lat, lng)
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        return parks


@api.route(GEOCODE_EP)
class Geocode(Resource):
    """Look up the coordinates of an NYC address or place."""

    @api.doc(params={
        'address': {'description': 'NYC address or place name to look up.',
                    'in': 'query', 'required': True, 'type': 'string'},
    })
    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Missing or invalid address')
    @api.response(HTTPStatus.NOT_FOUND.value, 'Address not found')
    @api.response(HTTPStatus.SERVICE_UNAVAILABLE.value,
                  'Address lookup unavailable')
    def get(self):
        """Return the lat, lng and full label of the best match."""
        try:
            return geo.geocode(request.args.get('address'))
        except geo.AddressNotFound as error:
            raise wz.NotFound(description=str(error)) from error
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        except geo.GeocodeUnavailable as error:
            raise wz.ServiceUnavailable(description=str(error)) from error


@api.route(PARK_EP)
class Park(Resource):
    """Retrieve one park by its identifier."""

    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.NOT_FOUND.value, 'Park not found')
    def get(self, park_id):
        """Return a park, including its boundary."""
        park = pqry.get_park(park_id)
        if park is None:
            raise wz.NotFound(f'Park {park_id} not found.')
        return park
