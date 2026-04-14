#!/bin/bash
# scripts/backup.sh
# Nightly backup for Zayvora databases and configs.

TARGET_DIR="/Volumes/ZayvoraBackup/daily" # Path to be verified
SOURCE_DIR="/Users/dharamdaxini/Downloads/via/zayvora-main/daxini.xyz"
LOG_FILE="$SOURCE_DIR/data/backup_log.txt"

echo "[$(date)] Starting Backup..." >> $LOG_FILE

# Ensure target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "[ERROR] External SSD not found at $TARGET_DIR. Aborting." >> $LOG_FILE
    exit 1
fi

# Create timestamped folder
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$TARGET_DIR/zayvora_$TIMESTAMP"
mkdir -p "$BACKUP_PATH"

# Copy Databases and Configs
cp "$SOURCE_DIR/data/telemetry.db" "$BACKUP_PATH/" 2>/dev/null
cp "$SOURCE_DIR/data/articles.json" "$BACKUP_PATH/" 2>/dev/null
cp "$SOURCE_DIR/.env.local" "$BACKUP_PATH/" 2>/dev/null
cp -R "$SOURCE_DIR/security" "$BACKUP_PATH/"

# Compress
tar -czf "$BACKUP_PATH.tar.gz" -C "$TARGET_DIR" "zayvora_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

echo "[$(date)] Backup Successful: zayvora_$TIMESTAMP.tar.gz" >> $LOG_FILE

# Unmount SSD as requested
# diskutil unmount /Volumes/ZayvoraBackup
