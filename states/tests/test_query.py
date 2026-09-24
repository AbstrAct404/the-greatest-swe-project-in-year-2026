import pytest

import states.query as qry

TEST_ST = qry.TEST_STATE


def test_check_valid_state():
    ret = qry.check_valid_state(TEST_ST['state_code'],
                                TEST_ST['population'],
                                TEST_ST['capital'],
                                TEST_ST['area_sq_miles'],
                                TEST_ST['name'])
    assert ret


def test_check_valid_state_bad_pop():
    with pytest.raises(ValueError):
        ret = qry.check_valid_state(TEST_ST['state_code'],
                                    -23423,
                                    TEST_ST['capital'],
                                    TEST_ST['area_sq_miles'],
                                    TEST_ST['name'])


def test_check_valid_state_code_too_short():
    with pytest.raises(ValueError):
        ret = qry.check_valid_state('',
                                    TEST_ST['population'],
                                    TEST_ST['capital'],
                                    TEST_ST['area_sq_miles'],
                                    TEST_ST['name'])


def test_check_valid_state_code_too_long():
    with pytest.raises(ValueError):
        ret = qry.check_valid_state('X' * qry.STATE_CODE_LEN * 2,
                                    TEST_ST['population'],
                                    TEST_ST['capital'],
                                    TEST_ST['area_sq_miles'],
                                    TEST_ST['name'])


def test_query():
    states = qry.read()
    assert isinstance(states, dict)
