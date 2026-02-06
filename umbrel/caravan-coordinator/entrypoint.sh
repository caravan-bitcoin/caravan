#!/bin/sh
set -e

# Compute Base64-encoded credentials for Bitcoin Core RPC
BITCOIN_RPC_AUTH=$(printf '%s:%s' "$BITCOIN_RPC_USER" "$BITCOIN_RPC_PASS" | base64)
export BITCOIN_RPC_AUTH
export BITCOIN_RPC_HOST
export BITCOIN_RPC_PORT

# Generate nginx config from template, substituting only our variables
# (nginx variables like $uri and $request_method are left untouched)
envsubst '$BITCOIN_RPC_HOST $BITCOIN_RPC_PORT $BITCOIN_RPC_AUTH' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Remove the default nginx config that listens on port 80
rm -f /etc/nginx/conf.d/default.conf.bak

exec nginx -g 'daemon off;'
