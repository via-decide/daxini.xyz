#!/bin/bash
# scripts/harden_firewall.sh
# Configures pf (macOS firewall) to block all direct incoming traffic except SSH and Tunnel loops.

PF_CONF="/etc/pf.conf"
BACKUP_CONF="/etc/pf.conf.bak.$(date +%Y%m%d%H%M%S)"

echo "[SECURITY] Backing up current PF configuration to $BACKUP_CONF..."
sudo cp $PF_CONF $BACKUP_CONF

# Prepare new rules
# 1. Allow loopback
# 2. Allow SSH (22)
# 3. Block all incoming by default
# 4. Allow incoming on high ports only if related to established connections (TCP state)

cat <<EOF | sudo tee /etc/pf.conf.zayvora
# ZAYVORA HARDENED RULES
set skip on lo0
scrub in all

# Default block
block in all
pass out all keep state

# Allow SSH
pass in proto tcp from any to any port 22 keep state

# Allow Cloudflare Tunnel (Tunnel establishes outbound connection, 
# but we allow response traffic via 'pass out all keep state')
# Note: Since tunnel is outbound, no specific inbound 'pass' is strictly needed 
# for cloudflared except for maintenance.

EOF

echo "[SECURITY] Validating new rules..."
sudo pfctl -nf /etc/pf.conf.zayvora

if [ $? -eq 0 ]; then
    echo "[SECURITY] Activation starting. REPLACING PF.CONF..."
    sudo cp /etc/pf.conf.zayvora /etc/pf.conf
    sudo pfctl -ef /etc/pf.conf
    echo "[SECURITY] Firewall Hardened."
else
    echo "[ERROR] Rules validation failed. Aborting."
fi
