#!/bin/sh
# Chạy một lần sau lần khởi động đầu tiên của Garage:
#   docker compose exec garage sh /scripts/garage-init.sh
#
# Script sẽ: setup layout → tạo bucket → tạo key → in thông tin key ra màn hình.
# Sau đó copy Key ID + Secret key vào server/.env (hoặc Coolify env vars).

set -e

BUCKET="${GARAGE_BUCKET:-giapha}"

echo "=== Garage Init Script ==="

# Đợi Garage API sẵn sàng
echo "Đang chờ Garage..."
until garage status >/dev/null 2>&1; do sleep 2; done
echo "Garage ready."

# 1. Setup layout (chỉ làm nếu chưa có)
NODE_ID=$(garage node id -q 2>/dev/null | head -1)
if [ -z "$NODE_ID" ]; then
  echo "Lỗi: không lấy được Node ID"
  exit 1
fi

LAYOUT_VERSION=$(garage layout show 2>/dev/null | grep -oE 'version [0-9]+' | awk '{print $2}' | head -1 || echo "0")
if [ "$LAYOUT_VERSION" = "0" ]; then
  echo "Cấu hình layout..."
  garage layout assign "$NODE_ID" --zone dc1 --capacity 100G
  garage layout apply --version 1
  echo "Layout đã áp dụng."
else
  echo "Layout đã có (version $LAYOUT_VERSION), bỏ qua."
fi

# 2. Tạo bucket
if ! garage bucket list | grep -q "^$BUCKET$"; then
  garage bucket create "$BUCKET"
  echo "Đã tạo bucket: $BUCKET"
else
  echo "Bucket '$BUCKET' đã tồn tại."
fi

# Cho phép anonymous read (để nginx proxy phục vụ ảnh không cần auth)
garage bucket allow "$BUCKET" --read --anonymous 2>/dev/null || true

# 3. Tạo key (nếu chưa có)
KEY_NAME="${BUCKET}-key"
if ! garage key list | grep -q "$KEY_NAME"; then
  garage key create "$KEY_NAME"
  echo "Đã tạo key: $KEY_NAME"
fi

KEY_ID=$(garage key list | grep "$KEY_NAME" | awk '{print $1}')
garage bucket allow "$BUCKET" --read --write --key "$KEY_ID" 2>/dev/null || true

# 4. In thông tin
echo ""
echo "=== Copy các giá trị sau vào server/.env (hoặc Coolify env vars) ==="
garage key info "$KEY_ID"
echo ""
echo "GARAGE_ENDPOINT=http://garage:3900"
echo "GARAGE_REGION=garage"
echo "GARAGE_BUCKET=$BUCKET"
echo "GARAGE_PUBLIC_URL=https://YOUR_DOMAIN/media"
echo ""
echo "Xem Key ID và Secret key ở phần 'Key info' phía trên."
echo "=== Xong ==="
