set shell := ["bash", "-euc"]

default:
    @just --list

# --- Contract -------------------------------------------------------------
# Hooks and CI call these. `fmt` and `lint` are checks: exit non-zero when
# something is wrong, do not fix it in place.

fmt:
    npx --no-install prettier --check .

lint:
    npx --no-install eslint .

build:
    node scripts/check-assets.mjs

test:
    node --test test/

pre-commit: fmt lint
pre-push: build test

ci: fmt lint build test spec-validate

install-hooks:
    git config core.hooksPath .githooks
    @echo "Hooks installed: pre-commit and pre-push now run via 'just'."

spec-list:
    openspec list

spec-validate:
    openspec validate --all
