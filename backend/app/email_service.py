import os
import resend

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "NaviKarier <noreply@navikarier.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_reset_password_email(to_email: str, token: str, user_name: str) -> bool:
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

    if not RESEND_API_KEY:
        print(f"[DEV] Reset password link for {to_email}: {reset_url}")
        return True

    resend.api_key = RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Reset Password — NaviKarier",
            "html": f"""
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #fafafa; margin-bottom: 8px;">Reset Password</h2>
                <p style="color: #a1a1aa; font-size: 14px;">
                    Hai {user_name}, kamu meminta reset password untuk akun NaviKarier-mu.
                </p>
                <a href="{reset_url}"
                   style="display: inline-block; background: #3b82f6; color: #fff;
                          padding: 12px 24px; border-radius: 8px; text-decoration: none;
                          font-weight: 600; margin: 20px 0;">
                    Reset Password
                </a>
                <p style="color: #71717a; font-size: 12px;">
                    Link ini berlaku selama 1 jam. Jika kamu tidak meminta reset password, abaikan email ini.
                </p>
            </div>
            """,
        })
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send reset email to {to_email}: {e}")
        return False
