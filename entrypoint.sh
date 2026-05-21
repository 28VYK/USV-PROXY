#!/bin/sh
# =============================================================================
# entrypoint.sh — DEPRECATED / NOT USED
# =============================================================================
# This script is no longer executed by the usv-proxy container.
#
# As of the OpenVPN sidecar refactor, the Dockerfile uses a direct CMD:
#   CMD ["node", ".next/standalone/server.js"]
#
# OpenVPN setup is now handled exclusively by the 'usv-vpn' sidecar container
# defined in docker-compose.yml. That container owns NET_ADMIN, /dev/net/tun,
# and the VPN credentials — keeping all privileged operations isolated from
# the Next.js application runtime.
#
# This file is kept for historical reference only and can be safely deleted.
# =============================================================================
echo "[entrypoint.sh] This script is deprecated and should not be called."
echo "[entrypoint.sh] The usv-proxy container now starts via CMD directly."
exec "$@"
