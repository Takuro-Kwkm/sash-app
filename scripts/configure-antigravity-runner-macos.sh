#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="${1:-$HOME/actions-runner}"
PLIST="${HOME}/Library/LaunchAgents/actions.runner.Takuro-Kwkm-sash-app.sash-gemini-worker-mac.plist"

if [[ ! -d "$RUNNER_DIR" ]]; then
  echo "ERROR: runner directory not found: $RUNNER_DIR" >&2
  exit 1
fi

if [[ ! -x "$RUNNER_DIR/svc.sh" ]]; then
  echo "ERROR: svc.sh not found or not executable: $RUNNER_DIR/svc.sh" >&2
  exit 1
fi

if [[ ! -f "$PLIST" ]]; then
  echo "ERROR: LaunchAgent plist not found: $PLIST" >&2
  echo "Install the GitHub runner service first with: $RUNNER_DIR/svc.sh install" >&2
  exit 1
fi

cd "$RUNNER_DIR"

./svc.sh stop || true

BACKUP="${PLIST}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$PLIST" "$BACKUP"
echo "backup=$BACKUP"

if /usr/libexec/PlistBuddy -c 'Print :SessionCreate' "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c 'Set :SessionCreate false' "$PLIST"
else
  /usr/libexec/PlistBuddy -c 'Add :SessionCreate bool false' "$PLIST"
fi

if /usr/libexec/PlistBuddy -c 'Print :LimitLoadToSessionType' "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c 'Set :LimitLoadToSessionType Aqua' "$PLIST"
else
  /usr/libexec/PlistBuddy -c 'Add :LimitLoadToSessionType string Aqua' "$PLIST"
fi

plutil -lint "$PLIST"

SESSION_CREATE="$(/usr/libexec/PlistBuddy -c 'Print :SessionCreate' "$PLIST")"
SESSION_TYPE="$(/usr/libexec/PlistBuddy -c 'Print :LimitLoadToSessionType' "$PLIST")"

if [[ "$SESSION_CREATE" != 'false' ]]; then
  echo "ERROR: SessionCreate must be false, got: $SESSION_CREATE" >&2
  exit 1
fi

if [[ "$SESSION_TYPE" != 'Aqua' ]]; then
  echo "ERROR: LimitLoadToSessionType must be Aqua, got: $SESSION_TYPE" >&2
  exit 1
fi

echo 'MACOS_RUNNER_SECURITY_SESSION_GATE=PASS'

./svc.sh start
./svc.sh status

echo
cat <<'EOF'
Antigravity runner LaunchAgent configuration applied.

Expected operating model:
- Mac user is logged in.
- Terminal does not need to stay open.
- Do not run ./run.sh while the service is active.
- If ./svc.sh install is run again, re-run this script because the plist may be regenerated.
- OAuth/Keychain secrets are never copied into GitHub Secrets by this script.
EOF
