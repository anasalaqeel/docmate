#!/bin/sh
set -e

if [ "$ENABLE_SSL" = "true" ]; then
    echo "Enabling SSL configuration..."
    cp /etc/nginx/nginx.https.conf /etc/nginx/conf.d/default.conf
else
    echo "Enabling HTTP configuration..."
    cp /etc/nginx/nginx.http.conf /etc/nginx/conf.d/default.conf
fi
