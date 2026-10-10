"""
This is the file containing all of the endpoints for our flask app.
The endpoint called `endpoints` will return all available endpoints.
"""
from http import HTTPStatus

from flask import Flask, request
from flask_restx import Resource, Api  # , fields  # Namespace
from flask_cors import CORS

import werkzeug.exceptions as wz

import parks.query as pqry

app = Flask(__name__)
CORS(app)
api = Api(app)

ENDPOINT_EP = '/endpoints'
ENDPOINT_RESP = 'Available endpoints'
HELLO_EP = '/hello'
HELLO_RESP = 'hello'
PARKS_EP = '/parks'
PARK_EP = '/parks/<string:park_id>'
MESSAGE = 'Message'


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

    @api.response(HTTPStatus.OK.value, 'Success')
    @api.response(HTTPStatus.BAD_REQUEST.value, 'Invalid query parameter')
    def get(self):
        """Return a page of parks, optionally filtered by borough, type, or acres."""
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
            )
        except ValueError as error:
            raise wz.BadRequest(description=str(error)) from error
        return parks


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
