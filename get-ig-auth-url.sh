#!/bin/bash
# Tạo Instagram OAuth URL (qua Facebook App) để lấy authorization code
# Sử dụng:
#   bash get-ig-auth-url.sh
#   bash get-ig-auth-url.sh --open

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi

CLIENT_ID="${IG_APP_ID:-${FB_APP_ID:-}}"
REDIRECT_URI="${IG_REDIRECT_URI:-${FB_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}}"
SCOPES="instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement,pages_manage_posts,public_profile"
OPEN_BROWSER="false"

if [ "${1:-}" = "--open" ]; then OPEN_BROWSER="true"; fi

if [ -z "$CLIENT_ID" ] || [ -z "$REDIRECT_URI" ]; then
  echo "❌ Thiếu IG_APP_ID (hoặc FB_APP_ID) và IG_REDIRECT_URI trong .env"
  exit 1
fi

STATE=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')

AUTH_URL=$(python3 - <<'PY' "$CLIENT_ID" "$REDIRECT_URI" "$SCOPES" "$STATE"
import sys
from urllib.parse import urlencode
client_id, redirect_uri, scopes, state = sys.argv[1:5]
query = urlencode({"client_id": client_id, "redirect_uri": redirect_uri,
  "scope": scopes, "response_type": "code", "state": state})
print(f"https://www.facebook.com/v22.0/dialog/oauth?{query}")
PY
)

echo "🔗 Instagram (via Facebook) authorize URL:"
echo "$AUTH_URL"
echo ""
echo "✅ Redirect URI: $REDIRECT_URI"
echo "✅ Scope: $SCOPES"
echo "✅ State: $STATE"
echo ""
echo "Sau khi authorize, chạy:"
echo "bash get-ig-token.sh '<callback-url-or-code>'"

if [ "$OPEN_BROWSER" = "true" ]; then
  open "$AUTH_URL" 2>/dev/null && echo "🌐 Đã mở trình duyệt." || echo "⚠️ Hãy mở URL trên thủ công."
fi
