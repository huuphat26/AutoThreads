#!/bin/bash
# Sử dụng: bash get-token.sh YOUR_CODE_HERE

CODE=$1

if [ -z "$CODE" ]; then
  echo "Usage: bash get-token.sh YOUR_CODE_HERE"
  exit 1
fi

CLIENT_ID="892023620308911"
CLIENT_SECRET="14269d48ac8473088009cdf41b040fc8"
REDIRECT_URI="https://proresearch-mariyah-superarctic.ngrok-free.dev"

echo "🔄 Đổi authorization code lấy short-lived token..."
RESPONSE=$(curl -s -X POST "https://graph.threads.net/oauth/access_token" \
  -F "client_id=$CLIENT_ID" \
  -F "client_secret=$CLIENT_SECRET" \
  -F "grant_type=authorization_code" \
  -F "redirect_uri=$REDIRECT_URI" \
  -F "code=$CODE")

echo "Short-lived token response: $RESPONSE"

SHORT_TOKEN=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")
USER_ID=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user_id','ERROR'))")

if [ "$SHORT_TOKEN" = "ERROR" ]; then
  echo "❌ Lỗi lấy short-lived token. Xem response ở trên."
  exit 1
fi

echo ""
echo "✅ Short-lived token: $SHORT_TOKEN"
echo "✅ User ID: $USER_ID"

echo ""
echo "🔄 Đổi sang long-lived token (60 ngày)..."
LONG_RESPONSE=$(curl -s "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=$CLIENT_SECRET&access_token=$SHORT_TOKEN")

echo "Long-lived token response: $LONG_RESPONSE"

LONG_TOKEN=$(echo $LONG_RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','ERROR'))")

if [ "$LONG_TOKEN" = "ERROR" ]; then
  echo "❌ Lỗi lấy long-lived token."
  exit 1
fi

echo ""
echo "✅ Long-lived token: $LONG_TOKEN"
echo ""
echo "📝 Cập nhật .env..."

# Update .env
ENV_FILE="/Users/macos/Desktop/autothreads/.env"
sed -i '' "s|THREADS_APP_ID=.*|THREADS_APP_ID=$CLIENT_ID|" "$ENV_FILE"
sed -i '' "s|THREADS_ACCESS_TOKEN=.*|THREADS_ACCESS_TOKEN=$LONG_TOKEN|" "$ENV_FILE"
sed -i '' "s|THREADS_USER_ID=.*|THREADS_USER_ID=$USER_ID|" "$ENV_FILE"

echo "✅ .env đã được cập nhật!"
echo ""
cat "$ENV_FILE" | grep -E "THREADS_APP_ID|THREADS_ACCESS_TOKEN|THREADS_USER_ID"
