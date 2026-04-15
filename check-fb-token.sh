#!/bin/bash
# check-fb-token.sh — Kiểm tra tình trạng token Facebook và gợi ý fix
# Sử dụng: bash check-fb-token.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then echo "❌ Không tìm thấy .env"; exit 1; fi

FB_APP_ID=$(grep "^FB_APP_ID=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')
FB_APP_SECRET=$(grep "^FB_APP_SECRET=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')
FB_PAGE_ACCESS_TOKEN=$(grep "^FB_PAGE_ACCESS_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')
FB_ACCESS_TOKEN=$(grep "^FB_ACCESS_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Facebook Token Diagnostics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$FB_APP_ID" ] || [ -z "$FB_APP_SECRET" ]; then
  echo "❌ Thiếu FB_APP_ID hoặc FB_APP_SECRET trong .env"
  exit 1
fi

APP_TOKEN="${FB_APP_ID}|${FB_APP_SECRET}"

check_token() {
  local label="$1"
  local token="$2"

  if [ -z "$token" ]; then
    echo ""
    echo "⚠️  $label: (trống, bỏ qua)"
    return
  fi

  echo ""
  echo "🔐 Kiểm tra: $label"
  echo "   Token (preview): ${token:0:40}..."

  RESULT=$(curl -s "https://graph.facebook.com/v22.0/debug_token?input_token=${token}&access_token=${APP_TOKEN}")

  python3 - "$RESULT" "$label" <<'PY'
import sys, json, datetime

raw, label = sys.argv[1], sys.argv[2]
d = json.loads(raw)
data = d.get('data', {})

is_valid = data.get('is_valid', False)
token_type = data.get('type', 'unknown')
scopes = data.get('scopes', [])
user_id = data.get('user_id', '')
profile_id = data.get('profile_id', '')
issued_at = data.get('issued_at', 0)
expires_at = data.get('expires_at', 0)
error = data.get('error', {})

status = '✅ Hợp lệ' if is_valid else '❌ KHÔNG hợp lệ'
print(f"   Status   : {status}")
print(f"   Type     : {token_type}")
print(f"   User ID  : {user_id}")
if profile_id:
    print(f"   Page ID  : {profile_id}")
if issued_at:
    print(f"   Issued   : {datetime.datetime.fromtimestamp(issued_at).strftime('%Y-%m-%d %H:%M')}")
if expires_at:
    dt = datetime.datetime.fromtimestamp(expires_at)
    days_left = (dt - datetime.datetime.now()).days
    print(f"   Expires  : {dt.strftime('%Y-%m-%d %H:%M')} ({days_left} ngày nữa)")
else:
    print(f"   Expires  : Không hết hạn (page token)")

print(f"   Scopes   : {scopes if scopes else '(trống!)'}")

if error:
    print(f"   Error    : [{error.get('code')}] {error.get('message','')}")

required = {'pages_read_engagement', 'pages_manage_metadata',
            'pages_read_user_content', 'pages_manage_ads',
            'pages_show_list', 'pages_messaging'}
has_required = required & set(scopes)
missing_required = required - set(scopes)

if not is_valid and error.get('code') == 190:
    print()
    print("   ⚠️  LỖI META #190 — Lý do có thể:")
    if not scopes:
        print("   • Token không có scope nào → lấy lại token với đúng permissions")
    elif missing_required:
        print(f"   • Thiếu page permissions: {missing_required}")
    if user_id and profile_id and user_id == profile_id:
        print("   • FB_PAGE_ID trùng với User ID → đây là Personal Profile, không phải Facebook Page!")
    print()
    print("   👉 Giải pháp: Chạy lại 'bash get-fb-auth-url.sh --open' rồi 'bash get-fb-token.sh <code>'")
elif not is_valid:
    print()
    print("   👉 Token không hợp lệ. Chạy lại flow xác thực.")
PY
}

check_token "FB_PAGE_ACCESS_TOKEN" "$FB_PAGE_ACCESS_TOKEN"
check_token "FB_ACCESS_TOKEN (user)" "$FB_ACCESS_TOKEN"

# Kiểm tra đặc biệt: FB_PAGE_ID vs FB_USER_ID có trùng nhau không
FB_PAGE_ID=$(grep "^FB_PAGE_ID=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')
FB_USER_ID=$(grep "^FB_USER_ID=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \t\r\n')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Kiểm tra cấu hình .env"
echo "   FB_USER_ID : $FB_USER_ID"
echo "   FB_PAGE_ID : $FB_PAGE_ID"

if [ "$FB_PAGE_ID" = "$FB_USER_ID" ]; then
  echo ""
  echo "   ⚠️  CẢNH BÁO: FB_PAGE_ID trùng với FB_USER_ID!"
  echo "   Điều này cho thấy bạn chưa có/lấy đúng Page Access Token."
  echo "   FB Page có ID khác với User ID."
  echo ""
  echo "   Kiểm tra xem tài khoản Facebook của bạn có quản lý Page nào không:"
  echo "   → Truy cập: https://www.facebook.com/pages/?category=your_pages"
  echo "   → Hoặc chạy: curl -s 'https://graph.facebook.com/v22.0/me/accounts?access_token=<USER_TOKEN>'"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Nếu cần lấy lại token:"
echo "   1. bash get-fb-auth-url.sh --open"
echo "   2. Authorize và copy callback URL"
echo "   3. bash get-fb-token.sh '<callback-url>'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
