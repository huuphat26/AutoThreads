// ============================================
// AUTO THREADS — Telegram Notification Service
// Dùng để gửi bản xem trước ảnh và nội dung bài đăng
// ============================================

export interface TelegramMessageParams {
  chatId: string;
  text: string;
  photoUrl?: string;
  replyMarkup?: unknown;
}

export class TelegramService {
  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || "";
  }

  private get defaultChatId(): string {
    return process.env.TELEGRAM_CHAT_ID || "";
  }

  private get isConfigured(): boolean {
    return !!(this.botToken && this.defaultChatId);
  }

  /** Gửi tin nhắn kèm ảnh (nếu có) */
  async sendPreview(params: Partial<TelegramMessageParams>): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn("[TelegramService] Chưa cấu hình TOKEN hoặc CHAT_ID");
      return false;
    }

    const chatId = params.chatId || this.defaultChatId;
    const { text, photoUrl } = params;

    try {
      if (photoUrl) {
        // Gửi ảnh kèm caption
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/sendPhoto`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo: photoUrl,
              caption: text,
              parse_mode: "HTML",
            }),
          },
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error(
            "[TelegramService] sendPhoto failed:",
            res.status,
            errorData,
          );
        }
        return res.ok;
      } else {
        // Gửi tin nhắn văn bản
        const res = await fetch(
          `https://api.telegram.org/bot${this.botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: text,
              parse_mode: "HTML",
            }),
          },
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error(
            "[TelegramService] sendMessage failed:",
            res.status,
            errorData,
          );
        }
        return res.ok;
      }
    } catch (err) {
      console.error("[TelegramService] Gửi lỗi:", err);
      return false;
    }
  }

  /** Thông báo khi bài đăng thành công */
  async notifySuccess(
    platform: string,
    permalink?: string,
    photoUrl?: string,
  ): Promise<void> {
    if (!this.isConfigured) return;
    const msg = `✅ <b>Đã đăng lên ${platform}!</b>\n${permalink ? `<a href="${permalink}">Xem bài viết</a>` : ""}`;
    await this.sendPreview({ text: msg, photoUrl });
  }

  /** Thông báo khi có lỗi */
  async notifyError(
    platform: string,
    error: string,
    photoUrl?: string,
  ): Promise<void> {
    if (!this.isConfigured) return;
    const msg = `❌ <b>Lỗi đăng bài ${platform}:</b>\n<code>${error}</code>`;
    await this.sendPreview({ text: msg, photoUrl });
  }
}

export const telegramService = new TelegramService();
