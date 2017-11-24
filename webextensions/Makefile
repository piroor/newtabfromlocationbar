NPM_MOD_DIR := $(CURDIR)/node_modules
NPM_BIN_DIR := $(NPM_MOD_DIR)/.bin

.PHONY: xpi install_dependency lint format

all: xpi

install_dependency:
	npm install

lint:
	$(NPM_BIN_DIR)/eslint . --ext=.js –report-unused-disable-directives

format:
	$(NPM_BIN_DIR)/eslint . --ext=.js –report-unused-disable-directives --fix

xpi: lint
	rm -f ./*.xpi
	zip -r -0 newtabfromlocationbar-we.xpi manifest.json background >/dev/null 2>/dev/null

