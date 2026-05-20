#!/usr/bin/env bash
#
# Install a specific rxdb (and optionally rxjs) version and run the test suite
# against it. Used to validate that rxdb-hooks works against multiple rxdb
# majors from a single codebase.
#
# Usage:
#   scripts/test-rxdb.sh <rxdb-version> [rxjs-version] [-- <extra jest args>]
#
# Examples:
#   scripts/test-rxdb.sh 14.1.1
#   scripts/test-rxdb.sh 15
#   scripts/test-rxdb.sh 16 7
#
# The script installs the requested versions via `yarn add --dev` *without*
# updating the lockfile (--no-lockfile). `yarn add` still rewrites
# package.json, so we snapshot package.json + yarn.lock up-front and restore
# them on EXIT (success, failure, or interrupt) so the working tree is left
# clean regardless of how the run terminates.

set -euo pipefail

SNAPSHOT_DIR="$(mktemp -d)"
cp package.json "$SNAPSHOT_DIR/package.json"
cp yarn.lock "$SNAPSHOT_DIR/yarn.lock"

restore_manifest() {
	local exit_code=$?
	echo "==> Restoring package.json and yarn.lock"
	cp "$SNAPSHOT_DIR/package.json" package.json
	cp "$SNAPSHOT_DIR/yarn.lock" yarn.lock
	rm -rf "$SNAPSHOT_DIR"
	exit "$exit_code"
}
trap restore_manifest EXIT INT TERM

if [ "$#" -lt 1 ]; then
	echo "Usage: $0 <rxdb-version> [rxjs-version] [-- <extra jest args>]" >&2
	exit 1
fi

RXDB_VERSION="$1"
shift

RXJS_VERSION=""
if [ "$#" -gt 0 ] && [ "$1" != "--" ] && [[ "$1" != -* ]]; then
	RXJS_VERSION="$1"
	shift
fi

if [ "$#" -gt 0 ] && [ "$1" = "--" ]; then
	shift
fi

PKGS=("rxdb@${RXDB_VERSION}")
if [ -n "$RXJS_VERSION" ]; then
	PKGS+=("rxjs@${RXJS_VERSION}")
fi

echo "==> Installing ${PKGS[*]} (no lockfile update)"
yarn add --dev --no-lockfile --ignore-scripts "${PKGS[@]}"

INSTALLED_RXDB=$(node -p "require('rxdb/package.json').version")
INSTALLED_RXJS=$(node -p "require('rxjs/package.json').version")
echo "==> Running tests against rxdb@${INSTALLED_RXDB}, rxjs@${INSTALLED_RXJS}"

yarn jest --no-cache --forceExit --runInBand "$@"
