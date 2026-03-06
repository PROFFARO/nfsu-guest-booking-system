import nodemailer from 'nodemailer';

/**
 * Email Service for NFSU Guest House Booking System
 * Sends formal, government-style email notifications for booking lifecycle events.
 */

// Create reusable transporter
let transporter;

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter;
}

// Common header/footer for all emails
function emailWrapper(title, bodyContent) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #d1d5db;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0056b3;padding:20px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                NATIONAL FORENSIC SCIENCES UNIVERSITY
              </h1>
              <p style="margin:4px 0 0;color:#cce0ff;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">
                DELHI CAMPUS — GUEST HOUSE MANAGEMENT SYSTEM
              </p>
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background:#e8eef4;padding:12px 24px;border-bottom:2px solid #d1d5db;">
              <h2 style="margin:0;color:#1a365d;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">
                ${title}
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 24px;border-top:2px solid #d1d5db;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                This is a system-generated notification. Do not reply to this email.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:10px;">
                NFSU Delhi Campus, LNJN-NICFS Campus, Sector 3, Rohini, Delhi-110085
              </p>
              <p style="margin:2px 0 0;color:#9ca3af;font-size:10px;">
                Contact: 011-27521091 | directoroffice_dc@nfsu.ac.in
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Reusable table row for booking details
function detailRow(label, value) {
    return `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8f9fa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4b5563;width:40%;">${label}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;color:#1f2937;font-weight:500;">${value}</td>
    </tr>`;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// ────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ────────────────────────────────────────────────────────────

/**
 * Booking Confirmation Email
 */
export function bookingConfirmationEmail(booking) {
    const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Your room requisition has been <strong style="color:#0f766e;">confirmed</strong>. Please find the details of your booking below:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      ${detailRow('Booking Reference', `<strong>${booking._id}</strong>`)}
      ${detailRow('Guest Name', booking.guestName)}
      ${detailRow('Room Number', booking.room?.roomNumber || 'N/A')}
      ${detailRow('Room Type', (booking.room?.type || 'N/A').toUpperCase())}
      ${detailRow('Floor / Block', `Floor ${booking.room?.floor || 'N/A'} — Block ${booking.room?.block || 'N/A'}`)}
      ${detailRow('Check-In Date', formatDate(booking.checkIn))}
      ${detailRow('Check-Out Date', formatDate(booking.checkOut))}
      ${detailRow('No. of Guests', booking.numberOfGuests)}
      ${detailRow('Purpose of Visit', (booking.purpose || 'N/A').toUpperCase())}
      ${detailRow('Total Amount', `<strong style="color:#0056b3;">${formatCurrency(booking.totalAmount)}</strong>`)}
      ${detailRow('Payment Status', booking.paymentStatus?.toUpperCase())}
      ${detailRow('Payment Mode', 'AT RECEPTION (CASH/CARD/UPI)')}
    </table>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Important Instructions
      </p>
      <ul style="margin:8px 0 0;padding-left:16px;color:#374151;font-size:12px;line-height:1.8;">
        <li>Please carry a valid government-issued photo ID at the time of check-in.</li>
        <li>Payment shall be made at the reception desk during check-in.</li>
        <li>Check-in time: 12:00 PM | Check-out time: 11:00 AM</li>
        <li>For any modifications, contact the Guest House office.</li>
      </ul>
    </div>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

    return {
        subject: `NFSU Guest House — Booking Confirmed [Ref: ${booking._id}]`,
        html: emailWrapper('BOOKING CONFIRMATION — OFFICIAL NOTIFICATION', body),
    };
}

/**
 * Booking Cancellation Email
 */
export function bookingCancellationEmail(booking) {
    const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Your booking has been <strong style="color:#dc2626;">cancelled</strong>. The details are as follows:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      ${detailRow('Booking Reference', `<strong>${booking._id}</strong>`)}
      ${detailRow('Guest Name', booking.guestName)}
      ${detailRow('Room Number', booking.room?.roomNumber || 'N/A')}
      ${detailRow('Check-In Date', formatDate(booking.checkIn))}
      ${detailRow('Check-Out Date', formatDate(booking.checkOut))}
      ${detailRow('Cancellation Reason', booking.cancellationReason || 'Not specified')}
      ${detailRow('Cancelled On', formatDate(booking.cancelledAt || new Date()))}
    </table>

    <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Refund Notice
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        If any advance payment was made, the refund will be processed as per NFSU Delhi Campus refund policy.
        Please contact the Guest House office for further assistance.
      </p>
    </div>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

    return {
        subject: `NFSU Guest House — Booking Cancelled [Ref: ${booking._id}]`,
        html: emailWrapper('BOOKING CANCELLATION — OFFICIAL NOTIFICATION', body),
    };
}

/**
 * Payment Status Change Email
 */
export function paymentStatusChangeEmail(booking, newStatus) {
    const isPaid = newStatus === 'paid';
    const statusColor = isPaid ? '#0f766e' : '#b45309';
    const statusLabel = isPaid ? 'PAID' : 'UNPAID';

    const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      The payment status for your booking has been updated to
      <strong style="color:${statusColor};">${statusLabel}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      ${detailRow('Booking Reference', `<strong>${booking._id}</strong>`)}
      ${detailRow('Guest Name', booking.guestName)}
      ${detailRow('Room Number', booking.room?.roomNumber || 'N/A')}
      ${detailRow('Check-In Date', formatDate(booking.checkIn))}
      ${detailRow('Check-Out Date', formatDate(booking.checkOut))}
      ${detailRow('Total Amount', `<strong style="color:#0056b3;">${formatCurrency(booking.totalAmount)}</strong>`)}
      ${detailRow('Payment Status', `<strong style="color:${statusColor};">${statusLabel}</strong>`)}
      ${detailRow('Updated On', formatDate(new Date()))}
    </table>

    ${isPaid ? `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Payment Received
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        Your payment of ${formatCurrency(booking.totalAmount)} has been received and recorded. 
        Please retain this email as your payment confirmation.
      </p>
    </div>` : `
    <div style="background:#fffbeb;border:1px solid #fde68a;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Payment Pending
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        Your payment status has been reverted to unpaid. Please ensure payment is completed at the reception desk. 
        Contact the Guest House office if you believe this is an error.
      </p>
    </div>`}

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

    return {
        subject: `NFSU Guest House — Payment ${statusLabel} [Ref: ${booking._id}]`,
        html: emailWrapper(`PAYMENT UPDATE — ${statusLabel}`, body),
    };
}

// ────────────────────────────────────────────────────────────
// SEND EMAIL FUNCTION
// ────────────────────────────────────────────────────────────

/**
 * Send an email using the configured transporter.
 * Fails silently in development if SMTP is not configured.
 */
export async function sendEmail(to, { subject, html }) {
    // Skip if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`📧 [Email Skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
        return { skipped: true };
    }

    try {
        const transport = getTransporter();
        const info = await transport.sendMail({
            from: `"NFSU Guest House" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log(`📧 Email sent to ${to} — MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`📧 Email failed to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}
