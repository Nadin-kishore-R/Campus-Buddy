#!/bin/bash
# restore_mongodb.sh - Restores the MongoDB database from a backup

if [ -z "$1" ]; then
  echo "Usage: ./restore_mongodb.sh <path_to_backup_directory>"
  exit 1
fi

BACKUP_PATH=$1
CONTAINER_NAME="campus_assistant_mongodb"
DB_NAME="campus_assistant_db"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "Error: Backup directory not found!"
  exit 1
fi

echo "Starting MongoDB restore..."

docker cp "$BACKUP_PATH" $CONTAINER_NAME:/tmp/restore_dump
docker exec $CONTAINER_NAME mongorestore --db $DB_NAME --drop /tmp/restore_dump
docker exec $CONTAINER_NAME rm -rf /tmp/restore_dump

echo "Restore completed successfully."
