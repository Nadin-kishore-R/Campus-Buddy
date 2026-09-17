#!/bin/bash
# backup_mongodb.sh - Backs up the MongoDB database

CONTAINER_NAME="campus_assistant_mongodb"
DB_NAME="campus_assistant_db"
BACKUP_DIR="./backups/mongodb/$(date +%Y%m%d_%H%M%S)"

echo "Starting MongoDB backup..."
mkdir -p "$BACKUP_DIR"

docker exec $CONTAINER_NAME mongodump --db $DB_NAME --out /tmp/dump
docker cp $CONTAINER_NAME:/tmp/dump/$DB_NAME "$BACKUP_DIR"
docker exec $CONTAINER_NAME rm -rf /tmp/dump

echo "Backup completed successfully at $BACKUP_DIR"
