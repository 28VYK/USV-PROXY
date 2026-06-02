#!/bin/bash
# =============================================================================
# setup.sh — Complete initialization script for the monitoring stack
# Runs ONCE on the VPS before the first `docker compose up`
#
# Steps performed:
#  1. Creates the shared Docker network (monitoring_net)
#  2. Downloads Grafana dashboards from the community
#  3. Displays instructions for the .env variables
#  4. Starts the monitoring stack
# =============================================================================

set -e  # Exit immediately on error

# ─── Terminal Colors ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${RESET}  $1"; }
log_ok()      { echo -e "${GREEN}[OK]${RESET}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${RESET}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${RESET} $1"; }
log_step()    { echo -e "\n${BOLD}${CYAN}══ $1 ══${RESET}"; }

# ─── Script Directory (project root) ─────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
DASHBOARDS_DIR="$SCRIPT_DIR/monitoring/grafana/dashboards"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   USV Proxy — Monitoring Stack Setup                     ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}\n"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Shared Docker network
# ─────────────────────────────────────────────────────────────────────────────
log_step "Step 1 — Docker network monitoring_net"

if docker network inspect monitoring_net &>/dev/null; then
    log_ok "Network 'monitoring_net' already exists."
else
    log_info "Creating external Docker network 'monitoring_net'..."
    docker network create monitoring_net
    log_ok "Network 'monitoring_net' created successfully."
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Environment variables check
# ─────────────────────────────────────────────────────────────────────────────
log_step "Step 2 — Environment variables check"

ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file does not exist at: $ENV_FILE"
    log_warn  "Create it from .env.example and fill it in before running the setup."
    exit 1
fi

MISSING_VARS=()
for var in GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD GRAFANA_BASIC_AUTH_USER GRAFANA_BASIC_AUTH_HASH METRICS_TOKEN; do
    if ! grep -q "^${var}=" "$ENV_FILE"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing variables in .env:"
    for v in "${MISSING_VARS[@]}"; do
        echo -e "   ${RED}✗${RESET} $v"
    done
    echo ""
    log_warn "Add the missing variables and run setup.sh again."
    echo ""
    echo -e "${YELLOW}How to generate GRAFANA_BASIC_AUTH_HASH:${RESET}"
    echo -e "  docker run --rm caddy:2-alpine caddy hash-password --plaintext \"YourPassword\""
    echo ""
    exit 1
fi

log_ok "All required environment variables are present."

# Dynamically extract and generate metrics_token.txt from .env for Prometheus
METRICS_TOKEN_VAL=$(grep "^METRICS_TOKEN=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r\n ')
mkdir -p "$SCRIPT_DIR/monitoring/prometheus"
echo -n "$METRICS_TOKEN_VAL" > "$SCRIPT_DIR/monitoring/prometheus/metrics_token.txt"
log_ok "metrics_token.txt generated dynamically from .env."


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Download Grafana Dashboards
# ─────────────────────────────────────────────────────────────────────────────
log_step "Step 3 — Downloading Grafana dashboards"

mkdir -p "$DASHBOARDS_DIR"

# Dashboard 1: Node Exporter Full (ID: 1860) — CPU, RAM, Disk, Network host
NODE_EXPORTER_DASHBOARD="$DASHBOARDS_DIR/node-exporter-full.json"
if [ -f "$NODE_EXPORTER_DASHBOARD" ]; then
    log_ok "node-exporter-full.json already exists — skipping."
else
    log_info "Downloading 'Node Exporter Full' (Grafana ID: 1860)..."
    if curl -fsSL \
        "https://grafana.com/api/dashboards/1860/revisions/latest/download" \
        -o "$NODE_EXPORTER_DASHBOARD"; then
        log_ok "node-exporter-full.json downloaded successfully."
    else
        log_warn "Could not download Node Exporter dashboard. You can add it manually from the UI."
    fi
fi

# Dashboard 2: Caddy Web Server metrics (ID: 20033) — HTTP metrics from Caddy admin API
CADDY_DASHBOARD="$DASHBOARDS_DIR/caddy-metrics.json"
if [ -f "$CADDY_DASHBOARD" ]; then
    log_ok "caddy-metrics.json already exists — skipping."
else
    log_info "Downloading 'Caddy Web Server Metrics' (Grafana ID: 20033)..."
    if curl -fsSL \
        "https://grafana.com/api/dashboards/20033/revisions/latest/download" \
        -o "$CADDY_DASHBOARD"; then
        log_ok "caddy-metrics.json downloaded successfully."
    else
        log_warn "Could not download Caddy dashboard."
        # Fallback to dashboard ID 14280
        log_info "Trying fallback Caddy dashboard (ID: 14280)..."
        if curl -fsSL \
            "https://grafana.com/api/dashboards/14280/revisions/latest/download" \
            -o "$CADDY_DASHBOARD"; then
            log_ok "caddy-metrics.json downloaded (fallback)."
        else
            log_warn "Both Caddy dashboard variants failed. Add manually from the Grafana UI."
        fi
    fi
fi

# Dashboard 3: Docker Container Metrics (ID: 179) — overview containers
DOCKER_DASHBOARD="$DASHBOARDS_DIR/docker-overview.json"
if [ -f "$DOCKER_DASHBOARD" ]; then
    log_ok "docker-overview.json already exists — skipping."
else
    log_info "Downloading 'Docker Container Metrics' (Grafana ID: 179)..."
    if curl -fsSL \
        "https://grafana.com/api/dashboards/179/revisions/latest/download" \
        -o "$DOCKER_DASHBOARD"; then
        log_ok "docker-overview.json downloaded successfully."
    else
        log_warn "Could not download Docker dashboard."
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Patch datasource UID in downloaded JSONs
# ─────────────────────────────────────────────────────────────────────────────
log_step "Step 4 — Patching datasource UID in dashboards"

# Grafana 11 requires the datasource UID in the JSON to match the one in provisioning.
# We defined uid: "prometheus" in datasources/prometheus.yml
for dashboard_file in "$DASHBOARDS_DIR"/*.json; do
    if [ -f "$dashboard_file" ]; then
        filename=$(basename "$dashboard_file")
        log_info "Patching datasource UID in $filename..."
        # Replace any reference to uid containing Prometheus with "prometheus"
        sed -i 's/"uid": ".*Prometheus.*"/"uid": "prometheus"/gI' "$dashboard_file" 2>/dev/null || true
        sed -i 's/"datasource": "Prometheus"/"datasource": {"type": "prometheus", "uid": "prometheus"}/g' "$dashboard_file" 2>/dev/null || true
    fi
done
log_ok "Datasource UID patching complete."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Restart existing stack (Caddy) + start monitoring
# ─────────────────────────────────────────────────────────────────────────────
log_step "Step 5 — Starting Docker stacks"

echo ""
log_warn "The main stack (Caddy) needs to be restarted to apply"
echo -e "         changes from the Caddyfile (global admin block + stats subdomain)."
echo ""
read -p "$(echo -e ${BOLD}Restart the main stack now? [y/N]: ${RESET})" -r RESTART_MAIN

if [[ "$RESTART_MAIN" =~ ^[Yy]$ ]]; then
    log_info "Restarting main stack..."
    cd "$SCRIPT_DIR"
    docker compose down
    docker compose up -d
    log_ok "Main stack restarted."
else
    log_warn "You chose not to restart now. Do it manually: docker compose down && docker compose up -d"
fi

echo ""
read -p "$(echo -e ${BOLD}Start the monitoring stack? [y/N]: ${RESET})" -r START_MONITORING

if [[ "$START_MONITORING" =~ ^[Yy]$ ]]; then
    log_info "Starting Prometheus + Grafana + Node Exporter..."
    cd "$SCRIPT_DIR"
    docker compose -f docker-compose.monitoring.yml up -d
    log_ok "Monitoring stack started."
else
    log_warn "Manual start: docker compose -f docker-compose.monitoring.yml up -d"
fi

# ─────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   Setup complete! Verification:                          ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${CYAN}docker ps${RESET}                          → all 8 containers running"
echo -e "  ${CYAN}docker logs usv-prometheus${RESET}         → verify scrape targets"
echo -e "  ${CYAN}docker logs usv-grafana${RESET}            → verify Grafana startup"
echo -e "  ${CYAN}docker logs usv-promtail${RESET}           → verify log collection"
echo -e "  ${CYAN}docker logs usv-loki${RESET}               → verify Loki ingestion"
echo ""
echo -e "  ${GREEN}https://stats.noteusv.tech${RESET} → Grafana (with HTTP Basic Auth)"
echo ""
echo -e "${YELLOW}Don't forget to add in Cloudflare DNS:${RESET}"
echo -e "  Type: A | Name: stats | Content: 130.61.31.45 | Proxied: ON"
echo ""

