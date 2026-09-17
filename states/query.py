#!/usr/bin/env python3

from data.db_connect import is_db_up


STATE_TEST_DATA = {
    "AL": {
        "population": 4903185,
        "capital": "Montgomery",
        "area_sq_miles": 52420,
        "name": 'Alabama',
    },
    "AK": {
        "population": 731545,
        "capital": "Juneau",
        "area_sq_miles": 665384,
        "name": 'Alaska',
    },
    "AZ": {
        "population": 7278717,
        "capital": "Phoenix",
        "area_sq_miles": 113990,
        "name": 'Arizona',
    },
    # Add more states as needed
}


def get_states():
    """
    Return a list of all states in the test data.
    """
    if not is_db_up():
        print("Database is down.")
        return None
    return STATE_TEST_DATA


def main():
    states = get_states()
    for state, data in states.items():
        print(f"State: {state}")
        print(f"Population: {data['population']}")
        print(f"Capital: {data['capital']}")
        print(f"Area (sq miles): {data['area_sq_miles']}")
        print("-" * 40)


if __name__ == "__main__":
    main()
