//! Port of `email_service.py` and the contact-form mail in `controllers.handle_contact`.
//! Resend REST API (`POST /emails`); failures are logged and swallowed, as before.

use serde_json::{json, Value};

use crate::AppState;

async fn send(st: &AppState, payload: Value) -> Result<(), String> {
    let resp = st
        .http
        .post("https://api.resend.com/emails")
        .bearer_auth(&st.cfg.resend_key)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(format!("HTTP {}: {}", resp.status(), resp.text().await.unwrap_or_default()))
    }
}

pub async fn send_reset_password_email(st: &AppState, to_email: &str, token: &str, user_name: &str) -> bool {
    let reset_url = format!("{}/reset-password?token={token}", st.cfg.frontend_url);
    if st.cfg.resend_key.is_empty() {
        println!("[DEV] Reset password link for {to_email}: {reset_url}");
        return true;
    }
    let html = format!(
        r##"
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
            "##
    );
    match send(
        st,
        json!({"from": st.cfg.from_email, "to": [to_email], "subject": "Reset Password — NaviKarier", "html": html}),
    )
    .await
    {
        Ok(()) => true,
        Err(e) => {
            println!("[EMAIL ERROR] Failed to send reset email to {to_email}: {e}");
            false
        }
    }
}

pub async fn send_invite_email(st: &AppState, to_email: &str, link: &str, company_name: &str, target_role: &str) -> bool {
    if st.cfg.resend_key.is_empty() {
        println!("[DEV] Invite link for {to_email} ({target_role} @ {company_name}): {link}");
        return true;
    }
    let html = format!(
        r##"
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="margin-bottom: 8px;">Undangan Asesmen Skill</h2>
                <p style="color: #52525b; font-size: 14px;">
                    {company_name} mengundangmu untuk asesmen posisi <strong>{target_role}</strong>.
                    Unggah CV-mu untuk melihat kecocokan skill secara instan.
                </p>
                <a href="{link}"
                   style="display: inline-block; background: #e11d48; color: #fff;
                          padding: 12px 24px; border-radius: 8px; text-decoration: none;
                          font-weight: 600; margin: 20px 0;">
                    Mulai Asesmen
                </a>
                <p style="color: #71717a; font-size: 12px;">Jika kamu tidak mengenali undangan ini, abaikan email ini.</p>
            </div>
            "##
    );
    let subject = format!("Undangan Asesmen — {target_role} di {company_name}");
    match send(st, json!({"from": st.cfg.from_email, "to": [to_email], "subject": subject, "html": html})).await {
        Ok(()) => true,
        Err(e) => {
            println!("[EMAIL ERROR] Failed to send invite email to {to_email}: {e}");
            false
        }
    }
}

/// `handle_contact`; always "succeeds" from the caller's point of view.
pub async fn send_contact_email(st: &AppState, name: &str, email: &str, kind: &str, message: &str) {
    if st.cfg.resend_key.is_empty() {
        println!("[DEV] Contact form: {name} <{email}> [{kind}]: {message}");
        return;
    }
    let html = format!(
        r##"
            <p><strong>Dari:</strong> {name} ({email})</p>
            <p><strong>Tipe:</strong> {kind}</p>
            <hr>
            <p>{message}</p>
            "##
    );
    let payload = json!({
        "from": "NaviKarier Contact <noreply@navikarier.com>",
        "to": [st.cfg.contact_email],
        "subject": format!("[Contact - {kind}] dari {name}"),
        "html": html,
        "reply_to": email,
    });
    if let Err(e) = send(st, payload).await {
        println!("[EMAIL ERROR] Contact form failed: {e}");
    }
}
