#!/bin/bash
# Sử dụng:
#   bash get-auth-url.sh
#   bash get-auth-url.sh https://your-redirect-uri
#   bash get-auth-url.sh --open

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

CLIENT_ID="${THREADS_APP_ID:-}"
REDIRECT_URI="${1:-${THREADS_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}}"
SCOPES="${THREADS_SCOPES:-threads_basic,threads_content_publish}"
OPEN_BROWSER="false"

if [ "${1:-}" = "--open" ]; then
  REDIRECT_URI="${THREADS_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}"
  OPEN_BROWSER="true"
fi

if [ -z "$CLIENT_ID" ] || [ -z "$REDIRECT_URI" ]; then
  echo "❌ Thiếu cấu hình. Cần THREADS_APP_ID và THREADS_REDIRECT_URI (hoặc NEXT_PUBLIC_APP_URL)."
  exit 1
fi

STATE=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')

AUTH_URL=$(python3 - <<'PY' "$CLIENT_ID" "$REDIRECT_URI" "$SCOPES" "$STATE"
import sys
from urllib.parse import urlencode

client_id, redirect_uri, scopes, state = sys.argv[1:5]
query = urlencode({
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "scope": scopes,
    "response_type": "code",
    "state": state,
})
print(f"https://threads.net/oauth/authorize?{query}")
PY
)

echo "🔗 Threads authorize URL:"
echo "$AUTH_URL"
echo ""
echo "✅ Redirect URI dùng để authorize/exchange: $REDIRECT_URI"
echo "✅ Scope: $SCOPES"
echo "✅ State (lưu lại để verify): $STATE"
echo ""
echo "Sau khi authorize, copy callback URL (hoặc chỉ giá trị code) rồi chạy:"
echo "bash get-token.sh '<callback-url-or-code>' '$REDIRECT_URI'"

if [ "$OPEN_BROWSER" = "true" ]; then
  if command -v open >/dev/null 2>&1; then
    open "$AUTH_URL"
    echo "🌐 Đã mở trình duyệt."
  else
    echo "⚠️ Không tìm thấy lệnh 'open'. Hãy mở URL thủ công."
  fi
fi
