#!/bin/sh
set -e

# Path to VPN configurations
VPN_DIR="/app/vpn"
OVPN_FILE="${VPN_DIR}/usv2.ovpn"
CREDS_FILE="/tmp/vpn-creds.txt"

echo "=== starting USV Proxy Container Init ==="

# Check if VPN credentials are provided
if [ -n "$VPN_USER" ] && [ -n "$VPN_PASS" ]; then
    echo "[INIT] VPN credentials detected. Configuring OpenVPN..."
    
    # Ensure VPN directory exists
    mkdir -p "$VPN_DIR"

    # Create credentials file
    echo "$VPN_USER" > "$CREDS_FILE"
    echo "$VPN_PASS" >> "$CREDS_FILE"
    chmod 600 "$CREDS_FILE"

    # Download OVPN configuration if it doesn't exist
    if [ ! -f "$OVPN_FILE" ]; then
        echo "[INIT] OpenVPN config not found locally. Downloading from USV epass portal..."
        if wget -q -O "$OVPN_FILE" https://epass.usv.ro/usv2.ovpn; then
            echo "[INIT] Successfully downloaded usv2.ovpn"
        else
            echo "[ERROR] Failed to download usv2.ovpn! Will check if an offline copy exists..."
        fi
    else
        echo "[INIT] Using existing usv2.ovpn config."
    fi

    # Verify OVPN file exists before starting
    if [ -f "$OVPN_FILE" ]; then
        echo "[INIT] Starting OpenVPN in daemon mode..."
        # Start OpenVPN letting it pull routing and configure the tunnel fully automatically
        # Also append legacy AES-128-CBC cipher support required by the USV VPN server
        openvpn --config "$OVPN_FILE" --auth-user-pass "$CREDS_FILE" --data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305:AES-128-CBC --daemon openvpn_client

        # Wait for the tun0 interface to be created (up to 15 seconds)
        echo "[INIT] Waiting for VPN interface tun0 to be created..."
        attempts=0
        while ! ip link show tun0 >/dev/null 2>&1; do
            sleep 1
            attempts=$((attempts + 1))
            if [ $attempts -gt 15 ]; then
                echo "[WARNING] OpenVPN timeout! Interface tun0 did not start."
                break
            fi
        done

        # If tun0 is active, verify tunnel connection
        if ip link show tun0 >/dev/null 2>&1; then
            echo "[INIT] ✅ OpenVPN tunnel established successfully."
            echo "[INIT] ✅ Routing and DNS configured automatically from VPN server!"
        else
            echo "[ERROR] OpenVPN interface tun0 failed to establish. Running proxy without VPN fallback..."
        fi
    else
        echo "[ERROR] OpenVPN configuration file is missing! Running without VPN..."
    fi
else
    echo "[INIT] ⚠️ VPN credentials not provided. Skipping VPN connection..."
fi

# Clean up credentials file from memory/tmp if exists (OpenVPN keeps them loaded in memory)
if [ -f "$CREDS_FILE" ]; then
    rm -f "$CREDS_FILE"
fi

# Start background wake-up job to auto-trigger the lazy-loaded session synchronization
(
  # Wait up to 15 seconds for Next.js to start listening on port 3000
  for i in $(seq 1 15); do
    if wget -q -O- http://127.0.0.1:3000/api/session-sync >/dev/null 2>&1; then
      echo "[INIT] Next.js session validation successfully woke up!"
      break
    fi
    sleep 1
  done
) &

echo "[INIT] Starting Next.js Standalone Server on port 3000..."
echo "=== init complete, transferring control ==="
exec node .next/standalone/server.js
