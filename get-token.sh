#!/bin/bash
# Sử dụng: bash get-token.sh YOUR_CODE_HERE [REDIRECT_URI]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

CODE="${1:-}"

if [ -z "$CODE" ]; then
  echo "Usage: bash get-token.sh YOUR_CODE_HERE [REDIRECT_URI]"
  exit 1
fi

if [[ "$CODE" == http*"code="* ]]; then
  CODE=$(python3 -c "import sys, urllib.parse as u; raw=sys.argv[1]; q=u.urlparse(raw).query; print(u.parse_qs(q).get('code',[''])[0])" "$CODE")
fi

if [ -z "$CODE" ]; then
  echo "❌ Không tách được authorization code từ input."
  exit 1
fi

CLIENT_ID="${THREADS_APP_ID:-}"
CLIENT_SECRET="${THREADS_APP_SECRET:-}"
REDIRECT_URI="${2:-${THREADS_REDIRECT_URI:-${NEXT_PUBLIC_APP_URL:-}}}"

if [[ "$CODE" == THAA* ]]; then
  echo "ℹ️ Bạn đã truyền trực tiếp Threads Access Token, đang tiến hành gia hạn 60 ngày..."
  SHORT_TOKEN="$CODE"
  USER_INFO=$(curl -s "https://graph.threads.net/v1.0/me?fields=id,username&access_token=$SHORT_TOKEN")
  USER_ID=$(echo "$USER_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
else
  if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$REDIRECT_URI" ]; then
    echo "❌ Thiếu cấu hình. Cần có THREADS_APP_ID, THREADS_APP_SECRET và REDIRECT_URI."
    exit 1
  fi

  echo "🔄 Đổi authorization code lấy short-lived token..."
  RESPONSE=$(curl -s -X POST "https://graph.threads.net/oauth/access_token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "client_id=$CLIENT_ID" \
    --data-urlencode "client_secret=$CLIENT_SECRET" \
    --data-urlencode "grant_type=authorization_code" \
    --data-urlencode "redirect_uri=$REDIRECT_URI" \
    --data-urlencode "code=$CODE")

  SHORT_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")
  USER_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id','ERROR'))")
fi
ERROR_SUBCODE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('error') or {}).get('error_subcode',''))")

if [ "$SHORT_TOKEN" = "ERROR" ]; then
  echo "❌ Lỗi lấy short-lived token. Xem response ở trên."
  if [ "$ERROR_SUBCODE" = "36006" ]; then
    echo ""
    echo "Nguyên nhân thường gặp với 36006 (Invalid verification code):"
    echo "1) Authorization code đã dùng rồi hoặc đã hết hạn (code chỉ dùng 1 lần, sống rất ngắn)."
    echo "2) redirect_uri lúc exchange KHÔNG khớp 100% với redirect_uri lúc authorize."
    echo "3) App ID / App Secret không đúng app đã tạo code."
  fi
  exit 1
fi

echo ""
echo "✅ Short-lived token: $SHORT_TOKEN"
echo "✅ User ID: $USER_ID"

echo ""
echo "🔄 Đổi sang long-lived token (60 ngày)..."
LONG_RESPONSE=$(curl -s "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=$CLIENT_SECRET&access_token=$SHORT_TOKEN")

echo "Long-lived token response: $LONG_RESPONSE"

LONG_TOKEN=$(echo "$LONG_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")

if [ "$LONG_TOKEN" = "ERROR" ]; then
  echo "❌ Lỗi lấy long-lived token."
  exit 1
fi

echo ""
echo "✅ Long-lived token: $LONG_TOKEN"
echo ""
echo "📝 Cập nhật .env..."

# Update .env
sed -i '' "s|THREADS_APP_ID=.*|THREADS_APP_ID=$CLIENT_ID|" "$ENV_FILE"
sed -i '' "s|THREADS_ACCESS_TOKEN=.*|THREADS_ACCESS_TOKEN=$LONG_TOKEN|" "$ENV_FILE"
sed -i '' "s|THREADS_USER_ID=.*|THREADS_USER_ID=$USER_ID|" "$ENV_FILE"

echo "✅ .env đã được cập nhật!"
echo ""
cat "$ENV_FILE" | grep -E "THREADS_APP_ID|THREADS_ACCESS_TOKEN|THREADS_USER_ID"
