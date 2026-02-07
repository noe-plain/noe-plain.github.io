#!/bin/bash

# Configuration
NODE_PATH="/usr/local/bin/node"
PROJECT_DIR="/Users/noeplain/Developer/noe-plain.github.io/portfolio-manager"
LOG_FILE="$HOME/Desktop/portfolio-manager.log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Start script
log "Starting Portfolio Manager..."

# Navigate to project directory
if cd "$PROJECT_DIR"; then
    log "Changed directory to $PROJECT_DIR"
else
    log "Error: Could not change directory to $PROJECT_DIR"
    read -p "Press any key to exit..."
    exit 1
fi

# Open browser in background after 2 seconds
(
    sleep 2
    log "Opening browser..."
    open "http://localhost:3000"
) &

# Start the server using node directly since we know where server.js is
if [ -f "server.js" ]; then
    log "Found server.js, starting server..."
    "$NODE_PATH" server.js 2>&1 | tee -a "$LOG_FILE"
else
    log "Error: server.js not found in $(pwd)"
    ls -la | tee -a "$LOG_FILE"
fi

log "Server stopped or crashed."
read -p "Press any key to exit..."
```bash
open -a "GitHub Desktop"
```
