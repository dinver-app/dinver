#! /usr/bin/env bash

set -e

npx sequelize-cli db:migrate

exec "${@}"