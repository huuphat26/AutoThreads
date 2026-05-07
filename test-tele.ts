
import { telegramService } from "./lib/services/telegram.service";

async function testTele() {
  console.log("--- ĐANG KIỂM TRA KẾT NỐI TELEGRAM ---");
  console.log("Token:", process.env.TELEGRAM_BOT_TOKEN?.slice(0, 10) + "...");
  console.log("Chat ID:", process.env.TELEGRAM_CHAT_ID);

  const success = await telegramService.sendPreview({
    text: "🚀 <b>Kiểm tra kết nối AutoThreads!</b>\nNếu bạn thấy tin nhắn này, cấu hình Telegram đã CHUẨN.",
    photoUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop&q=60"
  });

  if (success) {
    console.log("✅ THÀNH CÔNG! Hãy kiểm tra điện thoại của bạn.");
  } else {
    console.log("❌ THẤT BẠI! Vui lòng kiểm tra lại Token hoặc Chat ID trong file .env.");
  }
}

testTele();
