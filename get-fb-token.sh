#!/bin/bash
# Đổi authorization code → short-lived → long-lived (60 ngày) → Page Access Token
# Sử dụng:
#   bash get-fb-token.sh YOUR_CODE_OR_CALLBACK_URL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
FB_API="https://graph.facebook.com/v22.0"

if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi

CODE="${1:-}"
if [ -z "$CODE" ]; then
  echo "Usage: bash get-fb-token.sh YOUR_CODE_OR_CALLBACK_URL"
  exit 1
fi

# Tự tách code nếu truyền vào full callback URL
if [[ "$CODE" == http*"code="* ]]; then
  CODE=$(python3 -c "import sys, urllib.parse as u; raw=sys.argv[1]; q=u.urlparse(raw).query; print(u.parse_qs(q).get('code',[''])[0])" "$CODE")
fi
if [ -z "$CODE" ]; then echo "❌ Không tách được authorization code."; exit 1; fi

CLIENT_ID="${FB_APP_ID:-}"
CLIENT_SECRET="${FB_APP_SECRET:-}"
REDIRECT_URI="${FB_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REDIRECT_URI" ]; then
  echo "❌ Thiếu FB_APP_ID, FB_APP_SECRET hoặc FB_REDIRECT_URI trong .env"
  exit 1
fi

# ── Bước 1: Đổi code → short-lived user token ─────────────────────────────────
echo "🔄 Bước 1/3 — Đổi code lấy short-lived token..."
SHORT_RESP=$(curl -s -X POST "$FB_API/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "redirect_uri=$REDIRECT_URI" \
  --data-urlencode "code=$CODE")
echo "  Response: $SHORT_RESP"

SHORT_TOKEN=$(echo "$SHORT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")
if [ "$SHORT_TOKEN" = "ERROR" ]; then echo "❌ Lỗi lấy short-lived token."; exit 1; fi
echo "  ✅ Short-lived token: ${SHORT_TOKEN:0:40}..."

# ── Bước 2: Đổi → long-lived user token (60 ngày) ─────────────────────────────
echo ""
echo "🔄 Bước 2/3 — Đổi sang long-lived token (60 ngày)..."
LONG_RESP=$(curl -s "$FB_API/oauth/access_token?grant_type=fb_exchange_token&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&fb_exchange_token=$SHORT_TOKEN")
echo "  Response: $LONG_RESP"

LONG_TOKEN=$(echo "$LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")
if [ "$LONG_TOKEN" = "ERROR" ]; then echo "❌ Lỗi lấy long-lived token."; exit 1; fi
echo "  ✅ Long-lived user token: ${LONG_TOKEN:0:40}..."

# Lấy user ID
USER_RESP=$(curl -s "$FB_API/me?fields=id,name&access_token=$LONG_TOKEN")
USER_ID=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
USER_NAME=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name',''))")
echo "  ✅ User: $USER_NAME (ID: $USER_ID)"

# ── Bước 3: Lấy Page Access Token ─────────────────────────────────────────────
echo ""
echo "🔄 Bước 3/3 — Lấy Page Access Token..."
PAGES_RESP=$(curl -s "$FB_API/me/accounts?access_token=$LONG_TOKEN")
echo "  Pages response: $PAGES_RESP"

PAGE_DATA=$(echo "$PAGES_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
if not data:
    print('NO_PAGE')
else:
    p = data[0]
    print(p['id'] + '|' + p['access_token'] + '|' + p.get('name',''))
")

if [ "$PAGE_DATA" = "NO_PAGE" ]; then
  echo "  ⚠️ Không tìm thấy Page nào. Lưu user token."
  PAGE_ID=""
  PAGE_TOKEN=""
else
  PAGE_ID=$(echo "$PAGE_DATA" | cut -d'|' -f1)
  PAGE_TOKEN=$(echo "$PAGE_DATA" | cut -d'|' -f2)
  PAGE_NAME=$(echo "$PAGE_DATA" | cut -d'|' -f3)
  echo "  ✅ Page: $PAGE_NAME (ID: $PAGE_ID)"
  echo "  ✅ Page token: ${PAGE_TOKEN:0:40}..."
fi

# ── Cập nhật .env ──────────────────────────────────────────────────────────────
echo ""
echo "📝 Cập nhật .env..."

update_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

update_env "FB_APP_ID"           "$CLIENT_ID"
update_env "FB_ACCESS_TOKEN"     "$LONG_TOKEN"
update_env "FB_USER_ID"          "$USER_ID"
[ -n "$PAGE_ID" ]    && update_env "FB_PAGE_ID"          "$PAGE_ID"
[ -n "$PAGE_TOKEN" ] && update_env "FB_PAGE_ACCESS_TOKEN" "$PAGE_TOKEN"

echo "✅ .env đã được cập nhật!"
echo ""
grep -E "^FB_" "$ENV_FILE" | sed 's/=.\{20,\}/=***HIDDEN***/g'
