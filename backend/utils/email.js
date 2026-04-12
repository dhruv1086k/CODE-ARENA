import { Resend } from 'resend'

/**
 * Sends a 6-digit OTP email for the given flow type.
 * Uses Resend HTTP API (port 443) — Render blocks all outbound SMTP ports.
 * @param {string} to      - Recipient email
 * @param {string} otp     - Plain-text 6-digit OTP
 * @param {'forgot_password'|'change_password'} type
 */
export async function sendOtpEmail(to, otp, type) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set in environment variables')
    throw new Error('RESEND_API_KEY must be set in environment variables')
  }

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || 'CodeArena <noreply@codearena.diy>'

  const subjects = {
    forgot_password: 'Reset your CodeArena password',
    change_password: 'CodeArena – confirm your password change',
  }

  const headings = {
    forgot_password: 'Password Reset',
    change_password: 'Confirm Password Change',
  }

  const messages = {
    forgot_password: 'You requested a password reset. Use the OTP below to create a new password. It expires in <strong>10 minutes</strong>.',
    change_password: 'Someone (hopefully you!) requested to change your CodeArena password. Use the OTP below to confirm. It expires in <strong>10 minutes</strong>.',
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;max-width:520px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #1f2937;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                <span style="color:#22c55e;">&lt;/&gt;</span> CodeArena
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:20px;font-weight:600;">${headings[type]}</h2>
              <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.6;">
                ${messages[type]}
              </p>

              <!-- OTP Box -->
              <div style="background:#0a0d14;border:1px solid #22c55e33;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Your OTP Code</p>
                <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#22c55e;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                If you did not request this, please ignore this email — your account is safe.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1f2937;background:#0d111c;">
              <p style="margin:0;color:#374151;font-size:12px;">
                © ${new Date().getFullYear()} CodeArena · This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: subjects[type],
      html,
    })

    if (error) {
      console.error(`[email] Resend error sending to ${to}:`, error)
      throw new Error(error.message)
    }

    console.log(`[email] OTP email sent to ${to} (type: ${type}) — id: ${data?.id}`)
  } catch (err) {
    console.error(`[email] Failed to send OTP email to ${to}:`, err.message)
    throw err
  }
}
