"""Shared setup for tests that require a running MongoDB server."""
import pytest

import data.db_connect as dbc


@pytest.fixture(scope='session')
def mongodb_available():
    """Check once; skip dependent integration tests if MongoDB is down."""
    if not dbc.is_db_up():
        pytest.skip('MongoDB is unavailable; start MongoDB to run this test.')
