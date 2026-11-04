"""
All interaction with MongoDB should be through this file!
We may be required to use a new database at any point.
"""
import os
from functools import wraps
from typing import Callable, TypeVar

import pymongo as pm

_Result = TypeVar('_Result')

LOCAL = "0"
CLOUD = "1"

SE_DB = 'seDB'

client = None

MONGO_ID = '_id'

# How long to wait for MongoDB before deciding it is down:
SERVER_TIMEOUT_MS = 3000

# GeoJSON / MongoDB order is [longitude, latitude].
GEO_POINT = 'Point'
DISTANCE_FIELD = 'distance'
SCORE_FIELD = 'score'
DEFAULT_GEO_LIMIT = 50


def connect_db():
    """
    This provides a uniform way to connect to the DB across all uses.
    Returns a mongo client object... maybe we shouldn't?
    Also set global client variable.
    We should probably either return a client OR set a
    client global.
    """
    global client
    if client is None:  # not connected yet!
        print('Setting client because it is None.')
        if os.environ.get('CLOUD_MONGO', LOCAL) == CLOUD:
            password = os.environ.get('MONGO_PASSWD')
            if not password:
                raise ValueError('You must set your password '
                                 + 'to use Mongo in the cloud.')
            print('Connecting to Mongo in the cloud.')
            client = pm.MongoClient(f'mongodb+srv://gcallah:{password}'
                                    + '@koukoumongo1.yud9b.mongodb.net/'
                                    + '?retryWrites=true&w=majority',
                                    serverSelectionTimeoutMS=SERVER_TIMEOUT_MS)
        else:
            print("Connecting to Mongo locally.")
            client = pm.MongoClient(serverSelectionTimeoutMS=SERVER_TIMEOUT_MS)
    return client


def ensure_connection(func: Callable[..., _Result]) -> Callable[..., _Result]:
    """Connect to MongoDB before running a database operation."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        connect_db()
        return func(*args, **kwargs)
    return wrapper


def is_db_up():
    """
    Returns True if the DB is up and running.
    Actually pings MongoDB, so it returns False if the server is down.
    """
    try:
        connect_db()
        client.admin.command('ping')
        return True
    except pm.errors.PyMongoError:
        return False


def convert_mongo_id(doc: dict):
    if MONGO_ID in doc:
        # Convert mongo ID to a string so it works as JSON
        doc[MONGO_ID] = str(doc[MONGO_ID])


@ensure_connection
def create(collection, doc, db=SE_DB):
    """
    Insert a single doc into collection.
    """
    print(f'{db=}')
    return client[db][collection].insert_one(doc)


@ensure_connection
def read_one(collection, filt, db=SE_DB):
    """
    Find with a filter and return on the first doc found.
    Return None if not found.
    """
    for doc in client[db][collection].find(filt):
        convert_mongo_id(doc)
        return doc


@ensure_connection
def delete(collection: str, filt: dict, db=SE_DB):
    """
    Find with a filter and return on the first doc found.
    """
    print(f'{filt=}')
    del_result = client[db][collection].delete_one(filt)
    return del_result.deleted_count


@ensure_connection
def update(collection, filters, update_dict, db=SE_DB):
    return client[db][collection].update_one(filters, {'$set': update_dict})


@ensure_connection
def read(collection, db=SE_DB, no_id=True) -> list:
    """
    Returns a list from the db.
    """
    ret = []
    for doc in client[db][collection].find():
        if no_id:
            del doc[MONGO_ID]
        else:
            convert_mongo_id(doc)
        ret.append(doc)
    return ret


def read_dict(collection, key, db=SE_DB, no_id=True) -> dict:
    recs = read(collection, db=db, no_id=no_id)
    recs_as_dict = {}
    for rec in recs:
        recs_as_dict[rec[key]] = rec
    return recs_as_dict


@ensure_connection
def fetch_all_as_dict(key, collection, db=SE_DB):
    ret = {}
    for doc in client[db][collection].find():
        del doc[MONGO_ID]
        ret[doc[key]] = doc
    return ret


def point(lng: float, lat: float) -> dict:
    """
    Make a GeoJSON point. Note the order: longitude first!
    """
    return {'type': GEO_POINT, 'coordinates': [lng, lat]}


@ensure_connection
def create_index(collection, keys, db=SE_DB, **kwargs):
    """
    Create an index. keys is a list of (field, index type) pairs,
    e.g. [('borough', pm.ASCENDING)]. Does nothing if it already exists.
    """
    return client[db][collection].create_index(keys, **kwargs)


def create_geo_index(collection, field, db=SE_DB):
    """
    Create a 2dsphere index, needed for $geoNear and $geoIntersects.
    """
    return create_index(collection, [(field, pm.GEOSPHERE)], db=db)


def create_text_index(collection, field, db=SE_DB):
    """
    Create a text index for word search on field.
    A collection can only have one text index.
    """
    return create_index(collection, [(field, pm.TEXT)], db=db)


@ensure_connection
def read_many(collection, filt=None, db=SE_DB, projection=None,
              sort=None, skip=0, limit=0) -> list:
    """
    Find all docs matching filt, with optional paging.
    limit=0 means no limit.
    """
    cursor = client[db][collection].find(filt or {}, projection)
    if sort:
        cursor = cursor.sort(sort)
    cursor = cursor.skip(skip).limit(limit)
    ret = []
    for doc in cursor:
        convert_mongo_id(doc)
        ret.append(doc)
    return ret


@ensure_connection
def count(collection, filt=None, db=SE_DB) -> int:
    """
    Count the docs matching filt.
    """
    return client[db][collection].count_documents(filt or {})


def text_filter(text: str, filt=None) -> dict:
    """
    A filter for docs matching text in the text index, plus filt.
    Use it with count() to count text search matches.
    """
    return {'$text': {'$search': text}, **(filt or {})}


@ensure_connection
def text_search(collection, text: str, db=SE_DB, projection=None,
                limit=DEFAULT_GEO_LIMIT, filt=None, skip=0,
                tiebreak=None) -> list:
    """
    Search the collection's text index, best matches first.
    Each doc gets a SCORE_FIELD with its relevance.
    filt narrows the matches further, and tiebreak is a sort for docs
    with the same score, so paging with skip is stable.
    """
    proj = dict(projection or {})
    proj[SCORE_FIELD] = {'$meta': 'textScore'}
    sort = [(SCORE_FIELD, {'$meta': 'textScore'})] + list(tiebreak or [])
    cursor = (client[db][collection]
              .find(text_filter(text, filt), proj)
              .sort(sort)
              .skip(skip)
              .limit(limit))
    ret = []
    for doc in cursor:
        convert_mongo_id(doc)
        ret.append(doc)
    return ret


@ensure_connection
def geo_near(collection, lng: float, lat: float, key: str,
             max_distance=None, filt=None, db=SE_DB, projection=None,
             limit=DEFAULT_GEO_LIMIT) -> list:
    """
    Find docs near a point, closest first, using $geoNear on key
    (which needs a 2dsphere index).
    Each doc gets a DISTANCE_FIELD in meters. For a polygon this is the
    distance to its nearest edge, and 0 if the point is inside it.
    """
    near = {
        'near': point(lng, lat),
        'key': key,
        'distanceField': DISTANCE_FIELD,
        'spherical': True,
    }
    if max_distance is not None:
        near['maxDistance'] = max_distance
    if filt:
        near['query'] = filt
    pipeline = [{'$geoNear': near}, {'$limit': limit}]
    if projection:
        pipeline.append({'$project': projection})
    ret = []
    for doc in client[db][collection].aggregate(pipeline):
        convert_mongo_id(doc)
        ret.append(doc)
    return ret


def geo_intersects(collection, lng: float, lat: float, key: str,
                   db=SE_DB, projection=None) -> list:
    """
    Find docs whose key geometry contains (intersects) the point.
    """
    filt = {key: {'$geoIntersects': {'$geometry': point(lng, lat)}}}
    return read_many(collection, filt, db=db, projection=projection)


@ensure_connection
def upsert_many(collection, docs: list, db=SE_DB) -> int:
    """
    Insert or replace each doc, matching on its MONGO_ID.
    Returns how many docs were inserted or changed.
    """
    if not docs:
        return 0
    ops = [pm.ReplaceOne({MONGO_ID: doc[MONGO_ID]}, doc, upsert=True)
           for doc in docs]
    result = client[db][collection].bulk_write(ops)
    return result.upserted_count + result.modified_count
