#!/usr/bin/env bash

set -euo pipefail

RELEASE_VER="$(node -p 'require("./package.json").version')"

GIT_TAG_NAME="v$RELEASE_VER"
git tag -a "$GIT_TAG_NAME" -m "$GIT_TAG_NAME"
git push origin "$GIT_TAG_NAME"
