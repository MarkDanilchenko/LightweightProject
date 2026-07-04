#!/bin/sh

if [ "$HTTPS" = "true" ]; then
    echo "HTTPS is enabled"
    export PROTOCOL="https"
else
    echo "HTTPS is disabled"
    export PROTOCOL="http"
fi

envsubst '${PROTOCOL}' < /etc/nginx/nginx.conf.conf > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
