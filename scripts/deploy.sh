#!/usr/bin/env bash
set -euo pipefail
# Usage: ./scripts/deploy.sh user@tailscale-host owner@example.com [https-port]
remote=${1:?SSH host required}
owner=${2:?Tailscale owner login required}
https_port=${3:-13443}
[[ "$owner" =~ ^[a-zA-Z0-9@._+-]+$ && "$https_port" =~ ^[0-9]+$ ]] || exit 1
npm ci
npm run build
# No existing routes or unrelated units are changed.
archive=$(mktemp -t weightapp.XXXXXX)
trap 'rm -f "$archive"' EXIT
COPYFILE_DISABLE=1 tar -czf "$archive" package.json package-lock.json server shared scripts dist
scp "$archive" "$remote:/tmp/weightapp-release.tar.gz"
ssh "$remote" bash -s -- "$owner" "$https_port" <<'REMOTE'
set -euo pipefail
owner=$1
https_port=$2
hostname=$(tailscale status --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
umask 077
mkdir -p ~/weightapp ~/.config/weightapp ~/.local/share/weightapp ~/.config/systemd/user
# Save pre-deployment Serve configuration for verification and rollback.
tailscale serve status --json > ~/.config/weightapp/serve-current.json
if [ ! -f ~/.config/weightapp/serve-before.json ]; then cp ~/.config/weightapp/serve-current.json ~/.config/weightapp/serve-before.json; fi
python3 - "$https_port" <<'PY'
import json,sys
from pathlib import Path
s=json.loads((Path.home()/'.config/weightapp/serve-current.json').read_text())
p=sys.argv[1]
route=next((v.get('Handlers',{}).get('/',{}) for k,v in s.get('Web',{}).items() if k.endswith(':'+p)),{})
if p in s.get('TCP',{}) and route.get('Proxy') != 'http://127.0.0.1:3107':
    raise SystemExit('HTTPS port already belongs to another service; choose another port')
PY
if ss -ltnH 'sport = :3107' | read -r _; then
  systemctl --user is-active --quiet weightapp || { echo 'Port 3107 occupied by another service'; exit 1; }
fi
tar -xzf /tmp/weightapp-release.tar.gz -C ~/weightapp
cd ~/weightapp
npm ci --omit=dev
printf 'PORT=3107\nWEIGHTAPP_OWNER=%s\nWEIGHTAPP_ORIGIN=https://%s:%s\nWEIGHTAPP_DATA=%s/.local/share/weightapp\nWEIGHTAPP_CONFIG=%s/.config/weightapp\n' "$owner" "$hostname" "$https_port" "$HOME" "$HOME" > ~/.config/weightapp/runtime.env
node --input-type=module -e "import {hostId} from './server/credentials.mjs'; await hostId();"
cp scripts/weightapp.service ~/.config/systemd/user/weightapp.service
systemctl --user daemon-reload
systemctl --user enable --now weightapp
systemctl --user restart weightapp
sudo -n tailscale serve --bg --https="$https_port" http://127.0.0.1:3107
systemctl --user is-active weightapp
echo "https://$hostname:$https_port/"
REMOTE
