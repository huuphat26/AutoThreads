#!/bin/bash
# refresh-all-tokens.sh — Gia hạn token 60 ngày cho cả 3 nền tảng
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi

ERRORS=0
SUCCESSES=0

# ── Helper: cập nhật hoặc thêm key vào .env ────────────────────────────────
update_env() {
  local key="$1" val="$2"
  val=$(echo "$val" | tr -d '\t\r\n ')
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

hr() { echo ""; echo "─────────────────────────────────────────────────────"; }

# ══════════════════════════════════════════════════════════════════════════════
# 1. THREADS
# ══════════════════════════════════════════════════════════════════════════════
hr
echo "🔄 [1/3] THREADS — Đổi sang long-lived token (60 ngày)..."

if [ -z "${THREADS_ACCESS_TOKEN:-}" ] || [ -z "${THREADS_APP_SECRET:-}" ]; then
  echo "  ⚠️  Bỏ qua: thiếu THREADS_ACCESS_TOKEN hoặc THREADS_APP_SECRET"
else
  TH_RESP=$(curl -s "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${THREADS_APP_SECRET}&access_token=${THREADS_ACCESS_TOKEN}")
  TH_TOKEN=$(echo "$TH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  TH_ERR=$(echo "$TH_RESP"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || true)

  if [ -n "$TH_TOKEN" ]; then
    TH_EXPIRES=$(echo "$TH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d.get('expires_in',0)/86400))" 2>/dev/null || echo "?")
    update_env "THREADS_ACCESS_TOKEN" "$TH_TOKEN"
    echo "  ✅ Threads token mới — hết hạn sau ~${TH_EXPIRES} ngày"
    SUCCESSES=$((SUCCESSES+1))
  else
    # Token đã long-lived → thử refresh
    TH_REFRESH=$(curl -s "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${THREADS_ACCESS_TOKEN}")
    TH_R_TOKEN=$(echo "$TH_REFRESH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
    if [ -n "$TH_R_TOKEN" ]; then
      TH_R_EXP=$(echo "$TH_REFRESH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d.get('expires_in',0)/86400))" 2>/dev/null || echo "?")
      update_env "THREADS_ACCESS_TOKEN" "$TH_R_TOKEN"
      echo "  ✅ Threads token đã refresh — hết hạn sau ~${TH_R_EXP} ngày"
      SUCCESSES=$((SUCCESSES+1))
    else
      echo "  ❌ Threads thất bại: ${TH_ERR:-$(echo $TH_RESP)}"
      ERRORS=$((ERRORS+1))
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# 2. FACEBOOK
# ══════════════════════════════════════════════════════════════════════════════
hr
echo "🔄 [2/3] FACEBOOK — Đổi sang long-lived token (60 ngày)..."
FB_API="https://graph.facebook.com/v22.0"

FB_TOKEN_INPUT="${FB_PAGE_ACCESS_TOKEN:-${FB_ACCESS_TOKEN:-}}"
FB_TOKEN_INPUT=$(echo "$FB_TOKEN_INPUT" | tr -d '\t\r\n ')

if [ -z "$FB_TOKEN_INPUT" ] || [ -z "${FB_APP_ID:-}" ] || [ -z "${FB_APP_SECRET:-}" ]; then
  echo "  ⚠️  Bỏ qua: thiếu FB_PAGE_ACCESS_TOKEN (hoặc FB_ACCESS_TOKEN), FB_APP_ID, FB_APP_SECRET"
else
  FB_LONG_RESP=$(curl -s "${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${FB_TOKEN_INPUT}")
  FB_LONG_TOKEN=$(echo "$FB_LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  FB_ERR=$(echo "$FB_LONG_RESP"       | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('error',{}); print(e.get('message',''))" 2>/dev/null || true)

  if [ -n "$FB_LONG_TOKEN" ]; then
    # Lấy user info
    FB_ME=$(curl -s "${FB_API}/me?fields=id,name&access_token=${FB_LONG_TOKEN}")
    FB_UID=$(echo "$FB_ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)
    FB_NAME=$(echo "$FB_ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || true)
    FB_EXPIRES=$(echo "$FB_LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('expires_in',0); print(round(e/86400) if e else 'không giới hạn (Page token)')" 2>/dev/null || echo "?")

    update_env "FB_PAGE_ACCESS_TOKEN" "$FB_LONG_TOKEN"
    # Chỉ cập nhật User ID nếu nó còn trống hoặc nếu ID lấy được KHÔNG trùng với Page ID
    if [ -n "$FB_UID" ]; then
      if [ -z "${FB_USER_ID:-}" ] || { [ "$FB_UID" != "${FB_PAGE_ID:-}" ] && [ "$FB_UID" != "${PID:-}" ]; }; then
        update_env "FB_USER_ID" "$FB_UID"
      fi
    fi
    echo "  ✅ Facebook token mới — User: ${FB_NAME} (${FB_UID}) — hết hạn: ${FB_EXPIRES}"

    # Lấy Page Access Token dài hạn (nếu chưa có)
    if [ -n "$FB_UID" ]; then
      PAGES_RESP=$(curl -s "${FB_API}/me/accounts?access_token=${FB_LONG_TOKEN}")
      PAGE_DATA=$(echo "$PAGES_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
if data:
    p = data[0]
    print(p['id'] + '|' + p['access_token'] + '|' + p.get('name',''))
" 2>/dev/null || true)
      if [ -n "$PAGE_DATA" ]; then
        PID=$(echo "$PAGE_DATA" | cut -d'|' -f1)
        PTOK=$(echo "$PAGE_DATA" | cut -d'|' -f2)
        PNAME=$(echo "$PAGE_DATA" | cut -d'|' -f3)
        update_env "FB_PAGE_ID" "$PID"
        update_env "FB_PAGE_ACCESS_TOKEN" "$PTOK"
        echo "  ✅ Page: ${PNAME} (${PID}) — Page token cập nhật"
      fi
    fi
    SUCCESSES=$((SUCCESSES+1))
  else
    echo "  ❌ Facebook thất bại: ${FB_ERR:-$(echo $FB_LONG_RESP | head -c 200)}"
    ERRORS=$((ERRORS+1))
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# 3. INSTAGRAM
# ══════════════════════════════════════════════════════════════════════════════
hr
echo "🔄 [3/3] INSTAGRAM — Đổi sang long-lived token (60 ngày)..."

IG_TOKEN_INPUT="${IG_ACCESS_TOKEN:-}"
IG_TOKEN_INPUT=$(echo "$IG_TOKEN_INPUT" | tr -d '\t\r\n ')
IG_CID="${IG_APP_ID:-${FB_APP_ID:-}}"
IG_CSEC="${IG_APP_SECRET:-${FB_APP_SECRET:-}}"

if [ -z "$IG_TOKEN_INPUT" ] || [ -z "$IG_CID" ] || [ -z "$IG_CSEC" ]; then
  echo "  ⚠️  Bỏ qua: thiếu IG_ACCESS_TOKEN, IG_APP_ID hoặc IG_APP_SECRET"
else
  # Thử với IG_APP trước, nếu lỗi fallback sang FB_APP (token có thể thuộc FB app)
  IG_LONG_RESP=$(curl -s "${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_CID}&client_secret=${IG_CSEC}&fb_exchange_token=${IG_TOKEN_INPUT}")
  _IG_CHECK=$(echo "$IG_LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  if [ -z "$_IG_CHECK" ] && [ "${IG_CID}" != "${FB_APP_ID:-}" ]; then
    IG_LONG_RESP=$(curl -s "${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${IG_TOKEN_INPUT}")
  fi
  IG_LONG_TOKEN=$(echo "$IG_LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
  IG_ERR=$(echo "$IG_LONG_RESP"       | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('error',{}); print(e.get('message',''))" 2>/dev/null || true)

  if [ -n "$IG_LONG_TOKEN" ]; then
    IG_EXPIRES=$(echo "$IG_LONG_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('expires_in',0); print(round(e/86400) if e else 'không giới hạn')" 2>/dev/null || echo "?")
    update_env "IG_ACCESS_TOKEN" "$IG_LONG_TOKEN"

    # Lấy IG Business Account ID nếu có page token
    if [ -n "${FB_PAGE_ID:-}" ] && [ -n "${FB_PAGE_ACCESS_TOKEN:-}" ]; then
      IG_ID_RESP=$(curl -s "${FB_API}/${FB_PAGE_ID}?fields=instagram_business_account&access_token=${FB_PAGE_ACCESS_TOKEN}")
      IG_BIZ_ID=$(echo "$IG_ID_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('instagram_business_account',{}).get('id',''))" 2>/dev/null || true)
      [ -n "$IG_BIZ_ID" ] && update_env "IG_USER_ID" "$IG_BIZ_ID" && echo "  ✅ Instagram Business Account: $IG_BIZ_ID"
    fi

    echo "  ✅ Instagram token mới — hết hạn: ${IG_EXPIRES} ngày"
    SUCCESSES=$((SUCCESSES+1))
  else
    echo "  ❌ Instagram thất bại: ${IG_ERR:-$(echo $IG_LONG_RESP | head -c 200)}"
    ERRORS=$((ERRORS+1))
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# KẾT QUẢ
# ══════════════════════════════════════════════════════════════════════════════
hr
echo ""
echo "📊 KẾT QUẢ: ✅ ${SUCCESSES}/3 thành công  ❌ ${ERRORS} lỗi"
if [ "$ERRORS" -eq 0 ]; then
  echo "🎉 Tất cả token đã được gia hạn và ghi vào .env!"
else
  echo "⚠️  Có ${ERRORS} nền tảng gặp lỗi — xem chi tiết ở trên."
fi
echo ""
