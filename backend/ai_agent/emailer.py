import os
import logging
import smtplib
import asyncio
from datetime import datetime, timezone
from email.message import EmailMessage
from ai_agent.config import get_ai_settings

logger = logging.getLogger("emailer")
logger.setLevel(logging.INFO)


def _send_smtp_sync(msg: EmailMessage, host: str, port: int, user: str, password: str):
    """Synchronous SMTP email delivery using standard library smtplib."""
    server = smtplib.SMTP(host, port, timeout=15)
    server.starttls()
    server.login(user, password)
    server.send_message(msg)
    server.quit()


async def send_donor_notification(
    donor: dict,
    blood_group: str,
    location: str,
    requester_message: str,
    requester_phone: str = "",
    db=None,
) -> dict:
    """
    Sends an automated emergency email to a registered donor when a matching request arrives.
    """
    subject = f"🚨 EMERGENCY BLOOD ALERT: {blood_group} Needed in {location}"
    phone_info = f"\n- Contact Phone: {requester_phone}" if requester_phone else ""
    
    plain_body = (
        f"Smart Blood Hub - Emergency Alert Dispatch\n\n"
        f"Hello {donor['name']},\n\n"
        f"An EMERGENCY request for {blood_group} blood in {location} was reported!\n\n"
        f"Request Details:\n"
        f"- Target Blood Group: {blood_group}\n"
        f"- Location: {location}"
        f"{phone_info}\n"
        f"- Requester Message: \"{requester_message}\"\n\n"
        f"Your blood type ({donor['blood_group']}) matches this emergency request.\n"
        f"If you are available to donate, please contact the requester or reply immediately.\n\n"
        f"Thank you for being a hero!\n"
        f"Smart Blood Hub Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #be123c, #9f1239); color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">🚨 EMERGENCY BLOOD ALERT</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Smart Blood Hub AI Emergency Network</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 15px; font-weight: bold; margin-top: 0;">Hello {donor['name']},</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">An urgent request for <strong>{blood_group}</strong> blood in <strong>{location}</strong> requires immediate assistance!</p>

          <div style="background: #f1f5f9; border-left: 4px solid #be123c; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #0f172a;">Request Summary:</p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Blood Group:</strong> {blood_group}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Location:</strong> {location}</p>
            {f'<p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Phone Number:</strong> {requester_phone}</p>' if requester_phone else ''}
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Details:</strong> "{requester_message}"</p>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.5;">Your registered blood type ({donor['blood_group']}) matches this emergency request. If you are available to help save a life, please reach out as soon as possible.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          &copy; 2024 Smart Blood Hub. AI Emergency Network & Registry.
        </div>
      </div>
    </body>
    </html>
    """

    settings = get_ai_settings()
    smtp_host = settings.smtp_host or os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(settings.smtp_port or os.getenv("SMTP_PORT", 587))
    smtp_user = (settings.smtp_user or os.getenv("SMTP_USER", "")).replace(" ", "").strip()
    smtp_pass = settings.get_smtp_pass

    status = "SIMULATED_SENT"
    if smtp_user and smtp_pass and smtp_user != "your_email@gmail.com":
        try:
            msg = EmailMessage()
            msg["From"] = f"Smart Blood Hub <{smtp_user}>"
            msg["To"] = donor["email"]
            msg["Subject"] = subject
            msg.set_content(plain_body)
            msg.add_alternative(html_content, subtype="html")

            await asyncio.to_thread(_send_smtp_sync, msg, smtp_host, smtp_port, smtp_user, smtp_pass)
            status = "DELIVERED"
            logger.info(f"Email successfully delivered via Gmail SMTP to donor {donor['email']}")
        except Exception as err:
            logger.warning(f"SMTP delivery error to {donor['email']}: {err}. Falling back to logged alert.")
            status = "SENT_LOGGED"

    if db is not None:
        logs_col = db["notification_logs"]
        new_id = (logs_col.count_documents({}) if hasattr(logs_col, "count_documents") else logs_col.count()) + 1
        log_doc = {
            "id": new_id,
            "donor_email": donor["email"],
            "donor_name": donor["name"],
            "blood_group": blood_group,
            "location": location,
            "message_content": plain_body,
            "status": status,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        logs_col.insert_one(log_doc)

    return {
        "donor_name": donor["name"],
        "donor_email": donor["email"],
        "status": status,
    }


async def send_verification_otp_email(
    email: str,
    name: str,
    otp: str,
    phone: str = "",
) -> dict:
    """
    Sends a 6-digit registration verification OTP to the real user via Gmail SMTP with clean subject & formatting.
    """
    subject = "Smart Blood Hub - Account Verification"
    phone_display = phone if phone else "Not provided"

    plain_body = (
        f"Smart Blood Hub - Email Verification\n\n"
        f"Hello {name},\n\n"
        f"Thank you for registering on Smart Blood Hub (AI Emergency Network & Registry).\n\n"
        f"Your 6-Digit Email Verification Code is:\n"
        f"========================\n"
        f"       {otp}           \n"
        f"========================\n\n"
        f"Account Registration Details:\n"
        f"- Full Name: {name}\n"
        f"- Registered Email: {email}\n"
        f"- Phone Number: {phone_display}\n\n"
        f"Please enter this 6-digit verification code on the registration page to activate your account.\n"
        f"This code will expire in 15 minutes.\n\n"
        f"Best regards,\n"
        f"Smart Blood Hub Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
        <!-- Title Banner -->
        <div style="background: linear-gradient(135deg, #be123c, #881337); color: #ffffff; padding: 28px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">Smart Blood Hub</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 600;">Email Verification</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 32px 28px;">
          <p style="font-size: 15px; font-weight: bold; margin-top: 0; color: #0f172a;">Hello {name},</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">Thank you for joining the Smart Blood Hub emergency network. Please use the 6-digit verification code below to verify your email and activate your account:</p>

          <!-- OTP Box with 1-tap Select & Copy Support -->
          <div style="background: #fff1f2; border: 2px dashed #f43f5e; border-radius: 16px; padding: 22px 16px; text-align: center; margin: 24px 0; user-select: all; -webkit-user-select: all; -ms-user-select: all;">
            <span style="font-size: 11px; font-weight: 800; color: #9f1239; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 10px;">Your 6-Digit Verification Code</span>
            <div style="font-size: 34px; font-weight: 900; color: #be123c; letter-spacing: 8px; font-family: Consolas, Monaco, monospace; user-select: all; -webkit-user-select: all; -ms-user-select: all; display: inline-block; padding: 10px 28px; background: #ffffff; border-radius: 12px; border: 1.5px solid #fecdd3; box-shadow: 0 2px 8px rgba(244,63,94,0.1); cursor: pointer;">
              {otp}
            </div>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #be123c; font-weight: 700;">📋 Tap or double-click code above to instantly select & copy</p>
          </div>

          <!-- User Details Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #334155; text-transform: uppercase;">Account Profile Summary:</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Full Name:</strong> {name}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Email Address:</strong> {email}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Phone Number:</strong> {phone_display}</p>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">This code is valid for 15 minutes. If you did not create an account on Smart Blood Hub, please ignore this email.</p>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          Smart Blood Hub &bull; AI Emergency Network & Registry &bull; mdmaiskatulmasabi278@gmail.com
        </div>
      </div>
    </body>
    </html>
    """

    settings = get_ai_settings()
    smtp_host = settings.smtp_host or os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(settings.smtp_port or os.getenv("SMTP_PORT", 587))
    smtp_user = (settings.smtp_user or os.getenv("SMTP_USER", "")).replace(" ", "").strip()
    smtp_pass = settings.get_smtp_pass

    status = "SIMULATED_SENT"
    if smtp_user and smtp_pass and smtp_user != "your_email@gmail.com":
        try:
            msg = EmailMessage()
            msg["From"] = f"Smart Blood Hub <{smtp_user}>"
            msg["To"] = email
            msg["Subject"] = subject
            msg.set_content(plain_body)
            msg.add_alternative(html_content, subtype="html")

            await asyncio.to_thread(_send_smtp_sync, msg, smtp_host, smtp_port, smtp_user, smtp_pass)
            status = "DELIVERED"
            logger.info(f"Verification OTP email delivered via Gmail SMTP to {email}")
        except Exception as err:
            logger.warning(f"SMTP delivery error to {email}: {err}. Code generated: {otp}")
            status = "SENT_LOGGED"
    else:
        logger.info(f"[SMTP REAL MODE] OTP for {email}: {otp}")

    return {
        "email": email,
        "otp": otp,
        "status": status,
    }
