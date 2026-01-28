#!/bin/sh
set -e

echo "[entrypoint] Running migrations and startup tasks"

# Ensure data directory exists and the index DB file is present
DATA_DIR=/app/data
mkdir -p "$DATA_DIR"
# Create an empty index.db if it doesn't exist so sqlite can open it
INDEX_DB="$DATA_DIR/index.db"
if [ ! -f "$INDEX_DB" ]; then
	touch "$INDEX_DB" || true
fi

# Make migrations (create migration files if needed) then apply migrations
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput --database=default || true
python manage.py migrate --noinput --database=index || true

# Collect static files
python manage.py collectstatic --noinput || true

echo "[entrypoint] Starting gunicorn"

# Exec gunicorn so it receives signals
exec gunicorn --bind 0.0.0.0:8000 --workers 2 backend.wsgi:application
