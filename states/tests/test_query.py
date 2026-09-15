import states.query as qry


def test_query():
    states = qry.get_states()
    assert isinstance(states, dict)
