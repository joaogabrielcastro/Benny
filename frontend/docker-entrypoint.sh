#!/bin/sh
set -e
# Coolify injeta PORT. O nginx deve escutar na mesma porta — senão 502 em / e em /favicon.ico.
LISTEN_PORT="${PORT:-80}"
case "$LISTEN_PORT" in
  '' | *[!0-9]*) LISTEN_PORT=80 ;;
esac

sed "s/__LISTEN_PORT__/${LISTEN_PORT}/g" /opt/nginx.conf.template > /etc/nginx/conf.d/default.conf

nginx -t
exec nginx -g "daemon off;"
