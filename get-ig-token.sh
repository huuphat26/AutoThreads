#!/bin/bash
# Đổi authorization code → short-lived → long-lived (60 ngày) → Instagram Business Account
# Sử dụng:
#   bash get-ig-token.sh YOUR_CODE_OR_CALLBACK_URL
#   bash get-ig-token.sh YOUR_CODE PAGE_ID   # nếu có nhiều Page, chỉ định Page ID

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
FB_API="https://graph.facebook.com/v22.0"

if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi

CODE="${1:-}"
FORCE_PAGE_ID="${2:-}"

if [ -z "$CODE" ]; then
  echo "Usage: bash get-ig-token.sh YOUR_CODE_OR_CALLBACK_URL [PAGE_ID]"
  exit 1
fi

# Tự tách code nếu truyền vào full callback URL
if [[ "$CODE" == http*"code="* ]]; then
  CODE=$(python3 -c "import sys, urllib.parse as u; raw=sys.argv[1]; q=u.urlparse(raw).query; print(u.parse_qs(q).get('code',[''])[0])" "$CODE")
fi
if [ -z "$CODE" ]; then echo "❌ Không tách được authorization code."; exit 1; fi

CLIENT_ID="${IG_APP_ID:-${FB_APP_ID:-}}"
CLIENT_SECRET="${IG_APP_SECRET:-${FB_APP_SECRET:-}}"
REDIRECT_URI="${IG_REDIRECT_URI:-${FB_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REDIRECT_URI" ]; then
  echo "❌ Thiếu IG_APP_ID/FB_APP_ID, IG_APP_SECRET/FB_APP_SECRET hoặc REDIRECT_URI trong .env"
  exit 1
fi

# ── Bước 1: Đổi code → short-lived user token ─────────────────────────────────
echo "🔄 Bước 1/4 — Đổi code lấy short-lived token..."
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
echo "🔄 Bước 2/4 — Đổi sang long-lived token (60 ngày)..."
LONG_RESP=$(curl -s "$FB_API/oauth/access_token?grant_type=fb_exchange_token&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&fb_exchange_token=$SHORT_TOKEN")
echo "  Response: $LONG_RESP"

LONG_TOKEN=$(echo "$LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")
if [ "$LONG_TOKEN" = "ERROR" ]; then echo "❌ Lỗi lấy long-lived token."; exit 1; fi

USER_RESP=$(curl -s "$FB_API/me?fields=id,name&access_token=$LONG_TOKEN")
USER_ID=$(echo "$USER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
echo "  ✅ Long-lived user token: ${LONG_TOKEN:0:40}..."

# ── Bước 3: Lấy Facebook Page & Page Access Token ─────────────────────────────
echo ""
echo "🔄 Bước 3/4 — Lấy Facebook Page Access Token..."
PAGES_RESP=$(curl -s "$FB_API/me/accounts?access_token=$LONG_TOKEN")
echo "  Pages: $PAGES_RESP"

PAGE_DATA=$(echo "$PAGES_RESP" | python3 -c "
import sys, json
force = sys.argv[1] if len(sys.argv) > 1 else ''
data = json.load(sys.stdin).get('data', [])
if not data:
    print('NO_PAGE')
    sys.exit()
if force:
    pages = [p for p in data if p['id'] == force]
    p = pages[0] if pages else data[0]
else:
    p = data[0]
print(p['id'] + '|' + p['access_token'] + '|' + p.get('name',''))
" "$FORCE_PAGE_ID")

if [ "$PAGE_DATA" = "NO_PAGE" ]; then
  echo "  ❌ Không tìm thấy Page. Bạn cần có Facebook Page với Instagram Business Account."
  exit 1
fi

PAGE_ID=$(echo "$PAGE_DATA" | cut -d'|' -f1)
PAGE_TOKEN=$(echo "$PAGE_DATA" | cut -d'|' -f2)
PAGE_NAME=$(echo "$PAGE_DATA" | cut -d'|' -f3)
echo "  ✅ Page: $PAGE_NAME (ID: $PAGE_ID)"

# ── Bước 4: Lấy Instagram Business Account ID ─────────────────────────────────
echo ""
echo "🔄 Bước 4/4 — Lấy Instagram Business Account ID..."
IG_RESP=$(curl -s "$FB_API/$PAGE_ID?fields=instagram_business_account&access_token=$PAGE_TOKEN")
echo "  IG response: $IG_RESP"

IG_ID=$(echo "$IG_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ig = d.get('instagram_business_account', {})
print(ig.get('id','ERROR'))
")

if [ "$IG_ID" = "ERROR" ] || [ -z "$IG_ID" ]; then
  echo ""
  echo "⚠️ Không tìm thấy Instagram Business Account gắn với Page '$PAGE_NAME'."
  echo "   → Vào Instagram app → Settings → Account type → Switch to Professional Account"
  echo "   → Sau đó kết nối với Facebook Page tại Facebook Settings → Linked Accounts"
  exit 1
fi
echo "  ✅ Instagram Business Account ID: $IG_ID"

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

update_env "IG_APP_ID"       "$CLIENT_ID"
update_env "IG_ACCESS_TOKEN" "$PAGE_TOKEN"
update_env "IG_USER_ID"      "$IG_ID"
update_env "IG_PAGE_ID"      "$PAGE_ID"

echo "✅ .env đã được cập nhật!"
echo ""
grep -E "^IG_" "$ENV_FILE" | sed 's/=.\{20,\}/=***HIDDEN***/g'
