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

/**
 * Password Reset Email
 */
export function sendPasswordResetEmail(user, resetUrl) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${user.name}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      We received a request to reset the password associated with your account on the NFSU Guest House Management System.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background-color:#0056b3;color:#ffffff;padding:12px 24px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;display:inline-block;">
        Reset Password
      </a>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Security Notice
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        This link is only valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact administration immediately. Do not share this link with anyone.
      </p>
    </div>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      If the button above does not work, copy and paste the following URL into your browser:<br/>
      <a href="${resetUrl}" style="color:#0056b3;word-wrap:break-word;">${resetUrl}</a>
    </p>`;

  return {
    subject: `NFSU Guest House — Password Reset Request`,
    html: emailWrapper('ACCOUNT RECOVERY — OFFICIAL NOTIFICATION', body),
  };
}

/**
 * Booking Update Email
 */
export function bookingUpdateEmail(booking, updatedFields, priceDiff) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Your booking details have been <strong style="color:#0f766e;">successfully updated</strong>. Please review your updated itinerary:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      ${detailRow('Booking Reference', `<strong>${booking._id}</strong>`)}
      ${detailRow('Room Number', booking.room?.roomNumber || 'N/A')}
      ${detailRow('Check-In Date', formatDate(booking.checkIn))}
      ${detailRow('Check-Out Date', formatDate(booking.checkOut))}
      ${detailRow('No. of Guests', booking.numberOfGuests)}
      ${detailRow('Purpose of Visit', (booking.purpose || 'personal').toUpperCase())}
      ${detailRow('Total Amount', `<strong style="color:#0056b3;">${formatCurrency(booking.totalAmount)}</strong>`)}
    </table>

    <div style="background:#f8f9fa;border:1px solid #e5e7eb;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#374151;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Summary of Changes
      </p>
      <ul style="margin:8px 0 0;padding-left:16px;color:#4b5563;font-size:12px;line-height:1.8;">
        <li><strong>Modified Fields:</strong> ${updatedFields.join(', ') || 'Various details'}</li>
        ${priceDiff !== 0 ? `<li><strong>Price Difference:</strong> ${priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : `-${formatCurrency(Math.abs(priceDiff))}`}</li>` : ''}
      </ul>
    </div>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

  return {
    subject: `NFSU Guest House — Booking Updated [Ref: ${booking._id}]`,
    html: emailWrapper('BOOKING UPDATE — OFFICIAL NOTIFICATION', body),
  };
}

/**
 * Invoice Email
 */
export function invoiceEmail(booking) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Please find attached the official <strong>Booking Receipt/Invoice</strong> for your stay at the NFSU Delhi Campus Guest House.
    </p>
    
    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Invoice Details
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        <strong>Total Amount:</strong> ${formatCurrency(booking.totalAmount)} <br/>
        <strong>Payment Status:</strong> ${(booking.paymentStatus || 'unpaid').toUpperCase()}
      </p>
    </div>

    <p style="margin:0 0 16px;color:#374151;font-size:12px;line-height:1.6;">
      This is a system-generated document. Ensure to retain a copy for your records.
    </p>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

  return {
    subject: `NFSU Guest House — Invoice / Receipt [Ref: ${booking._id}]`,
    html: emailWrapper('BOOKING RECEIPT & INVOICE', body),
  };
}

/**
 * Gatepass Email
 */
export function gatepassEmail(booking) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Your Smart Gatepass for entry to the NFSU Delhi Campus Guest House has been generated. Ensure to present this QR code or token at the reception scanning station upon arrival.
    </p>

    <div style="text-align:center;margin:24px 0;padding:24px;border:2px dashed #d1d5db;background:#ffffff;border-radius:8px;">
      <p style="margin:0 0 12px;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Secure Check-In QR Code
      </p>
      <img src="cid:gatepass-qrcode" alt="QR Code" style="display:block;margin:0 auto;width:150px;height:150px;border:1px solid #e5e7eb;padding:8px;border-radius:8px;" />
      
      <div style="margin-top:16px;">
        <p style="margin:0 0 4px;font-size:10px;color:#6b7280;text-transform:uppercase;">6-Digit Entry Token</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:#0056b3;letter-spacing:4px;">${booking.checkInToken}</p>
      </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      ${detailRow('Room Number', booking.room?.roomNumber || 'N/A')}
      ${detailRow('Check-In Date', formatDate(booking.checkIn))}
      ${detailRow('Check-Out Date', formatDate(booking.checkOut))}
    </table>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

  const qrBase64 = booking.qrCode.split(',')[1];

  return {
    subject: `NFSU Guest House — Smart Gatepass Token [Ref: ${booking._id}]`,
    html: emailWrapper('SMART GATEPASS & ENTRY TOKEN', body),
    attachments: [
      {
        filename: 'gatepass-qrcode.png',
        content: Buffer.from(qrBase64, 'base64'),
        cid: 'gatepass-qrcode' // referenced in the img tag
      }
    ]
  };
}

/**
 * AI Action - Maintenance Report Email
 */
export function maintenanceReportEmail(booking, issue) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      This is to confirm that the Campus AI Assistant has successfully logged a maintenance report for your room.
    </p>
    
    <div style="background:#fffbeb;border:1px solid #fde68a;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Report Details
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        <strong>Room:</strong> ${booking.room?.roomNumber || 'N/A'} <br/>
        <strong>Issue Profile:</strong> ${issue} <br/>
        <strong>Status:</strong> Notified to Maintenance Team
      </p>
    </div>

    <p style="margin:0 0 16px;color:#374151;font-size:12px;line-height:1.6;">
      The relevant personnel have been dispatched to address the concern as soon as possible.
    </p>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

  return {
    subject: `NFSU Guest House — Maintenance Logged [Room ${booking.room?.roomNumber}]`,
    html: emailWrapper('AI SUPPORT — MAINTENANCE RECORDED', body),
  };
}

/**
 * AI Action - Supply Request Email
 */
export function supplyRequestEmail(booking, itemsList, specialInstructions) {
  const body = `
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Dear <strong>${booking.guestName}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:13px;line-height:1.6;">
      Your request for additional room supplies has been processed by the Campus AI Assistant and forwarded to Housekeeping.
    </p>
    
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        Request Summary
      </p>
      <p style="margin:8px 0 0;color:#374151;font-size:12px;line-height:1.6;">
        <strong>Room:</strong> ${booking.room?.roomNumber || 'N/A'} <br/>
        <strong>Requested Items:</strong> ${itemsList} <br/>
        ${specialInstructions ? `<strong>Instructions:</strong> ${specialInstructions}` : ''}
      </p>
    </div>

    <p style="margin:0 0 16px;color:#374151;font-size:12px;line-height:1.6;">
      The housekeeping staff will deliver the requested amenities to your room shortly.
    </p>

    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      For queries: <strong>011-27521091</strong> | <strong>directoroffice_dc@nfsu.ac.in</strong>
    </p>`;

  return {
    subject: `NFSU Guest House — Hospitality Request [Room ${booking.room?.roomNumber}]`,
    html: emailWrapper('AI SUPPORT — SERVICE REQUEST CONFIRMED', body),
  };
}

// ────────────────────────────────────────────────────────────
// SEND EMAIL FUNCTION
// ────────────────────────────────────────────────────────────

/**
 * Send an email using the configured transporter.
 * Fails silently in development if SMTP is not configured.
 */
export async function sendEmail(to, { subject, html, attachments }) {
  // Skip if SMTP is not configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [Email Skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }

  try {
    const transport = getTransporter();
    const mailOptions = {
      from: `"NFSU Guest House" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    if (attachments) {
      mailOptions.attachments = attachments;
    }

    const info = await transport.sendMail(mailOptions);

    console.log(`📧 Email sent to ${to} — MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`📧 Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}
