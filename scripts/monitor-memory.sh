#!/bin/bash
# Memory monitoring script for toreka-tracker

echo "=== Toreka Tracker Memory Monitor ==="
echo ""

# Function to convert bytes to MB
bytes_to_mb() {
  echo "scale=2; $1 / 1024" | bc
}

while true; do
  # Get timestamp
  timestamp=$(date "+%Y-%m-%d %H:%M:%S")

  # Get Node.js process memory
  node_mem=$(ps aux | grep "node dist/index.js" | grep -v grep | awk '{print $6}')

  # Get Chrome/Chromium memory
  chrome_mem=$(ps aux | grep -E "(chrome|chromium)" | grep -v grep | awk '{mem+=$6} END {print mem}')

  # Get total memory
  total_mem=$((node_mem + chrome_mem))

  # Convert to MB
  if [ -n "$node_mem" ]; then
    node_mb=$(bytes_to_mb $node_mem)
  else
    node_mb=0
  fi

  if [ -n "$chrome_mem" ]; then
    chrome_mb=$(bytes_to_mb $chrome_mem)
  else
    chrome_mb=0
  fi

  total_mb=$(bytes_to_mb $total_mem)

  # Display
  echo "[$timestamp] Node: ${node_mb}MB | Chrome: ${chrome_mb}MB | Total: ${total_mb}MB"

  # Wait 5 seconds
  sleep 5
done
