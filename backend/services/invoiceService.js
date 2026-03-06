import PDFDocument from 'pdfkit';

/**
 * Invoice PDF Generator for NFSU Guest House Booking System.
 * Generates formal, government-style booking receipts.
 */

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatCurrency(amount) {
    return `Rs. ${Number(amount).toLocaleString('en-IN')}/-`;
}

/**
 * Generate a booking invoice PDF and pipe it to the response.
 * @param {Object} booking - Populated booking document
 * @param {Object} res - Express response object
 */
export function generateInvoicePDF(booking, res) {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
            Title: `NFSU_Invoice_${booking._id}`,
            Author: 'NFSU Guest House Management System',
            Subject: `Booking Receipt — ${booking._id}`,
        },
    });

    // Stream to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NFSU_Invoice_${booking._id}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ─── HEADER ────────────────────────────────────────
    // Blue header band
    doc.rect(0, 0, doc.page.width, 85).fill('#0056b3');

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff')
        .text('NATIONAL FORENSIC SCIENCES UNIVERSITY', 50, 22, { width: pageWidth, align: 'center' });

    doc.fontSize(8).font('Helvetica').fillColor('#cce0ff')
        .text('DELHI CAMPUS — GUEST HOUSE MANAGEMENT SYSTEM', 50, 42, { width: pageWidth, align: 'center' });

    doc.fontSize(8).fillColor('#cce0ff')
        .text('LNJN-NICFS Campus, Sector 3, Rohini, Delhi-110085', 50, 55, { width: pageWidth, align: 'center' });

    doc.fontSize(8).fillColor('#cce0ff')
        .text('Phone: 011-27521091 | Email: directoroffice_dc@nfsu.ac.in', 50, 67, { width: pageWidth, align: 'center' });

    // ─── TITLE BAR ─────────────────────────────────────
    doc.rect(50, 100, pageWidth, 28).fill('#e8eef4');
    doc.rect(50, 100, pageWidth, 28).lineWidth(1).stroke('#b0c4de');

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a365d')
        .text('BOOKING RECEIPT / INVOICE', 50, 108, { width: pageWidth, align: 'center' });

    // ─── REFERENCE & DATE ──────────────────────────────
    let y = 145;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4b5563')
        .text('RECEIPT NO:', 50, y);
    doc.fontSize(8).font('Helvetica').fillColor('#1f2937')
        .text(`NFSU-GH-${booking._id.toString().slice(-8).toUpperCase()}`, 130, y);

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4b5563')
        .text('DATE:', 380, y);
    doc.fontSize(8).font('Helvetica').fillColor('#1f2937')
        .text(formatDate(new Date()), 415, y);

    y += 15;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4b5563')
        .text('BOOKING ID:', 50, y);
    doc.fontSize(8).font('Helvetica').fillColor('#1f2937')
        .text(booking._id.toString(), 130, y);

    // ─── DIVIDER ───────────────────────────────────────
    y += 20;
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).lineWidth(1).stroke('#d1d5db');

    // ─── GUEST DETAILS ─────────────────────────────────
    y += 12;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a365d')
        .text('GUEST DETAILS', 50, y);
    y += 16;

    const col1 = 50;
    const col2 = 180;
    const col3 = 310;
    const col4 = 410;
    const rowH = 14;

    function labelValue(lx, vx, yy, label, value) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#6b7280').text(label, lx, yy);
        doc.fontSize(8.5).font('Helvetica').fillColor('#1f2937').text(value || 'N/A', vx, yy);
    }

    labelValue(col1, col2, y, 'GUEST NAME:', booking.guestName);
    labelValue(col3, col4, y, 'PHONE:', booking.phone);
    y += rowH;
    labelValue(col1, col2, y, 'EMAIL:', booking.email);
    labelValue(col3, col4, y, 'NO. OF GUESTS:', String(booking.numberOfGuests));
    y += rowH;
    labelValue(col1, col2, y, 'PURPOSE:', (booking.purpose || 'personal').toUpperCase());

    // ─── DIVIDER ───────────────────────────────────────
    y += 22;
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).lineWidth(1).stroke('#d1d5db');

    // ─── ROOM & STAY DETAILS ───────────────────────────
    y += 12;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a365d')
        .text('ROOM & STAY DETAILS', 50, y);
    y += 18;

    // Table header
    const tableLeft = 50;
    const colWidths = [120, 100, 100, 80, pageWidth - 400];

    doc.rect(tableLeft, y, pageWidth, 20).fill('#f3f4f6');
    doc.rect(tableLeft, y, pageWidth, 20).lineWidth(0.5).stroke('#d1d5db');

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#4b5563');
    let tx = tableLeft + 8;
    ['ROOM NO.', 'TYPE / FLOOR / BLOCK', 'CHECK-IN', 'CHECK-OUT', 'NIGHTS'].forEach((h, i) => {
        doc.text(h, tx, y + 6);
        tx += colWidths[i];
    });

    // Table row
    y += 20;
    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

    doc.rect(tableLeft, y, pageWidth, 22).lineWidth(0.5).stroke('#d1d5db');
    doc.fontSize(8).font('Helvetica').fillColor('#1f2937');
    tx = tableLeft + 8;
    const rowData = [
        booking.room?.roomNumber || 'N/A',
        `${(booking.room?.type || 'N/A').toUpperCase()} / Floor ${booking.room?.floor || '-'} / Block ${booking.room?.block || '-'}`,
        formatDate(booking.checkIn),
        formatDate(booking.checkOut),
        `${nights} Night(s)`,
    ];
    rowData.forEach((val, i) => {
        doc.text(val, tx, y + 7);
        tx += colWidths[i];
    });

    // ─── BILLING SUMMARY ──────────────────────────────
    y += 42;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a365d')
        .text('BILLING SUMMARY', 50, y);
    y += 18;

    const billLeft = 310;
    const billWidth = pageWidth - 260;

    function billRow(yy, label, value, bold = false) {
        doc.rect(billLeft, yy, billWidth, 20).lineWidth(0.5).stroke('#d1d5db');
        doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#4b5563')
            .text(label, billLeft + 8, yy + 6);
        doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? '#0056b3' : '#1f2937')
            .text(value, billLeft + 8, yy + 6, { width: billWidth - 16, align: 'right' });
    }

    const pricePerNight = booking.room?.pricePerNight || Math.round(booking.totalAmount / nights);

    billRow(y, 'Rate per Night', formatCurrency(pricePerNight)); y += 20;
    billRow(y, `Duration (${nights} Night${nights > 1 ? 's' : ''})`, `× ${nights}`); y += 20;

    // Total row (highlighted)
    doc.rect(billLeft, y, billWidth, 24).fill('#0056b3');
    doc.rect(billLeft, y, billWidth, 24).lineWidth(0.5).stroke('#004494');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
        .text('TOTAL AMOUNT', billLeft + 8, y + 7);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
        .text(formatCurrency(booking.totalAmount), billLeft + 8, y + 7, { width: billWidth - 16, align: 'right' });

    // ─── PAYMENT STATUS ────────────────────────────────
    y += 40;
    const isPaid = booking.paymentStatus === 'paid';
    const statusBg = isPaid ? '#ecfdf5' : '#fffbeb';
    const statusBorder = isPaid ? '#a7f3d0' : '#fde68a';
    const statusText = isPaid ? '#065f46' : '#92400e';
    const statusLabel = isPaid ? 'PAID' : 'UNPAID';

    doc.rect(50, y, pageWidth, 32).fill(statusBg);
    doc.rect(50, y, pageWidth, 32).lineWidth(1).stroke(statusBorder);

    doc.fontSize(8).font('Helvetica-Bold').fillColor(statusText)
        .text(`PAYMENT STATUS: ${statusLabel}`, 60, y + 6);
    doc.fontSize(7.5).font('Helvetica').fillColor(statusText)
        .text(`Payment Method: ${(booking.paymentMethod || 'Cash').toUpperCase()} | Status updated as of ${formatDate(new Date())}`, 60, y + 19);

    // ─── SPECIAL REQUESTS ──────────────────────────────
    if (booking.specialRequests) {
        y += 46;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#4b5563')
            .text('SPECIAL REQUESTS:', 50, y);
        doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
            .text(booking.specialRequests, 50, y + 12, { width: pageWidth });
    }

    // ─── FOOTER ────────────────────────────────────────
    const footerY = doc.page.height - 80;

    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).lineWidth(1).stroke('#d1d5db');

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af')
        .text('THIS IS A SYSTEM-GENERATED DOCUMENT. NO SIGNATURE IS REQUIRED.', 50, footerY + 8, { width: pageWidth, align: 'center' });

    doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
        .text('National Forensic Sciences University, Delhi Campus | LNJN-NICFS Campus, Sector 3, Rohini, Delhi-110085', 50, footerY + 22, { width: pageWidth, align: 'center' });

    doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
        .text(`Generated on: ${new Date().toLocaleString('en-IN')} | Document ID: NFSU-GH-${booking._id.toString().slice(-8).toUpperCase()}`, 50, footerY + 34, { width: pageWidth, align: 'center' });

    // Finalize
    doc.end();
}
