#!/usr/bin/env python3

STATE_TEST_DATA = {
    "Alabama": {
        "population": 4903185,
        "capital": "Montgomery",
        "area_sq_miles": 52420,
        "abbreviation": 'AL',
    },
    "Alaska": {
        "population": 731545,
        "capital": "Juneau",
        "area_sq_miles": 665384,
        "abbreviation": 'AK',
    },
    "Arizona": {
        "population": 7278717,
        "capital": "Phoenix",
        "area_sq_miles": 113990,
        "abbreviation": 'AZ',
    },
    # Add more states as needed
}


def get_states():
    """Return a list of all states in the test data."""
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
