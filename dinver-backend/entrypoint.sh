#! /usr/bin/env bash

set -e

dotenvx run -- npx sequelize-cli db:migrate

exec "${@}"