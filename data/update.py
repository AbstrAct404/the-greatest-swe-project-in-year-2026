"""Schedule periodic refreshes of the parks data in MongoDB."""
import os
from threading import Lock

from apscheduler.schedulers.background import BackgroundScheduler

DEFAULT_UPDATE_INTERVAL_DAYS = 7
UPDATE_INTERVAL_ENV = 'MONGO_UPDATE_INTERVAL_DAYS'

scheduler = BackgroundScheduler()
_start_lock = Lock()


def update_database():
    """Fetch the latest parks records and upsert them into MongoDB."""
    from parks.load import load_parks

    return load_parks()


def start_update():
    """Start one refresh job using the configured interval, if not running."""
    with _start_lock:
        if scheduler.running:
            return
        interval_days = float(os.environ.get(
            UPDATE_INTERVAL_ENV, DEFAULT_UPDATE_INTERVAL_DAYS
        ))
        if interval_days <= 0:
            raise ValueError(f'{UPDATE_INTERVAL_ENV} must be greater than 0')
        scheduler.add_job(
            update_database,
            'interval',
            days=interval_days,
            id='mongodb-update',
            replace_existing=True,
        )
        scheduler.start()
