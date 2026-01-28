#!/bin/sh
set -e

# Compute API URL from environment
API_URL="http://localhost:8011/api"
if [ -n "$BACKEND_HOST_PORT" ]; then
  API_URL="http://localhost:${BACKEND_HOST_PORT}/api"
elif [ -n "$VITE_API_URL" ]; then
  API_URL="$VITE_API_URL"
fi

echo "Using API URL: $API_URL"

# Replace any occurrences of common build-time API URLs in the served files
# Support patterns like http://localhost:8000/api, http://localhost:8011/api, http://localhost:8010/api
if [ -d "/usr/share/nginx/html" ]; then
  find /usr/share/nginx/html -type f -exec sed -i "s|http://localhost:[0-9]\+/api|${API_URL}|g" {} \; || true
  # Replace any remaining exact matches
  find /usr/share/nginx/html -type f -exec sed -i "s|http://localhost/api|${API_URL}|g" {} \; || true
fi

exec "$@"
