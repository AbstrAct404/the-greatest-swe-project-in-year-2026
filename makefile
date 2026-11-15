include common.mk

# Our directories
API_DIR = server
DB_DIR = data
PARKS_DIR = parks
SEC_DIR = security
REQ_DIR = .

FORCE:

prod: all_tests github

github: FORCE
	- git commit -a
	git push origin main

all_tests: FORCE
	cd $(API_DIR); make tests
	cd $(DB_DIR); make tests
	cd $(PARKS_DIR); make tests

# Fetch every park from NYC Open Data into the local MongoDB:
load: FORCE
	python3 -m parks.load

dev_env: FORCE
	pip install -r $(REQ_DIR)/requirements-dev.txt
	@echo "You should set PYTHONPATH to: "
	@echo $(shell pwd)

audit: FORCE
	@command -v python >/dev/null || { echo "Activate the Python environment before running the audit."; exit 1; }
	@command -v npm >/dev/null || { echo "npm is required to run the frontend audit."; exit 1; }
	python -m pip install pip-audit
	pip-audit -r $(REQ_DIR)/requirements-dev.txt
	cd frontend && npm audit --audit-level=low

docs: FORCE
	cd $(API_DIR); make docs
