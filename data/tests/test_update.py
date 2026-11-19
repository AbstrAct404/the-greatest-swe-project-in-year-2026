"""Check refresh configuration without starting background threads."""
from unittest.mock import patch

import pytest

import data.update as update


@pytest.fixture
def scheduler():
    with patch.object(update, 'scheduler') as mock:
        mock.running = False
        yield mock


@pytest.mark.parametrize('value', ['nan', 'inf', '-inf', '0', '-1'])
def test_invalid_interval_does_not_schedule(monkeypatch, scheduler, value):
    monkeypatch.setenv(update.UPDATE_INTERVAL_ENV, value)

    with pytest.raises(ValueError, match='finite and greater than 0'):
        update.start_update()

    scheduler.add_job.assert_not_called()
    scheduler.start.assert_not_called()


@pytest.mark.parametrize('value, expected', [
    (None, 7), ('0.5', 0.5), ('1', 1),
])
def test_valid_interval_schedules_refresh(
        monkeypatch, scheduler, value, expected):
    if value is None:
        monkeypatch.delenv(update.UPDATE_INTERVAL_ENV, raising=False)
    else:
        monkeypatch.setenv(update.UPDATE_INTERVAL_ENV, value)

    update.start_update()

    scheduler.add_job.assert_called_once_with(
        update.update_database, 'interval', days=expected,
        id='mongodb-update', replace_existing=True,
    )
    scheduler.start.assert_called_once()
