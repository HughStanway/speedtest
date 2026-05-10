#!/bin/bash
set -e

echo "Verifying Speedtest CLI installation..."

# Check if speedtest is installed and if it's the Ookla version
# Ookla speedtest has a --version that includes "Speedtest by Ookla"
IS_OOKLA=$(speedtest --version 2>&1 | grep -i "Ookla" || true)

if [ -z "$IS_OOKLA" ]; then
    echo "Ookla Speedtest CLI not found or incorrect version. Installing..."
    apt-get update && apt-get install -y curl gnupg
    # Remove any existing speedtest-cli (Python version) to avoid conflicts
    apt-get remove -y speedtest-cli || true
    curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash
    apt-get install -y speedtest
    echo "Ookla Speedtest CLI installed successfully."
else
    echo "Ookla Speedtest CLI is already installed."
fi

# Execute the application
exec "$@"
