import { config } from "../config.js";

function codeEmailHtml(code) {
  return `<!doctype html>
<html lang="ru">
  <body style="margin:0;background:#041011;font-family:Arial,sans-serif;color:#ffffff">
    <div style="max-width:560px;margin:0 auto;padding:36px 20px">
      <div style="border:1px solid rgba(169,236,86,.32);border-radius:20px;background:#07191a;padding:32px;text-align:center">
        <div style="font-size:13px;letter-spacing:7px;color:#a9ec56;font-weight:700">TOURISK</div>
        <h1 style="margin:24px 0 10px;font-size:24px">Код входа</h1>
        <p style="margin:0;color:#aab9b7;line-height:1.5">Введите этот код в приложении. Он действует 10 минут.</p>
        <div style="margin:28px 0;font-size:38px;letter-spacing:10px;font-weight:800;color:#ffffff">${code}</div>
        <p style="margin:0;color:#70827f;font-size:13px">Если вы не запрашивали код, просто проигнорируйте письмо.</p>
      </div>
    </div>
  </body>
</html>`;
}

export function isEmailDeliveryConfigured() {
  return Boolean(config.resendApiKey && config.emailFrom);
}

export async function sendLoginCodeEmail({ email, code, requestId }) {
  if (!isEmailDeliveryConfigured()) {
    if (config.nodeEnv !== "production" && config.emailDevMode) {
      console.log(`[Tourisk auth] ${email}: ${code}`);
      return { id: `dev-${requestId}`, devCode: code };
    }

    const error = new Error("Сервис отправки писем временно не настроен");
    error.status = 503;
    throw error;
  }

  const payload = {
    from: config.emailFrom,
    to: [email],
    subject: `${code} — код входа в Tourisk`,
    html: codeEmailHtml(code),
    text: `Код входа в Tourisk: ${code}. Код действует 10 минут.`,
  };

  if (config.emailReplyTo) payload.reply_to = config.emailReplyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `tourisk-login-${requestId}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Resend error:", response.status, data);
    const error = new Error("Не удалось отправить письмо с кодом");
    error.status = 502;
    throw error;
  }

  return data;
}
