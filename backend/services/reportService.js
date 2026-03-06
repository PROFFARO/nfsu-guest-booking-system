import Booking from '../models/Booking.js';

/**
 * Generate CSV content from bookings data.
 * Used by the export endpoint for government audit reports.
 */
export function bookingsToCSV(bookings) {
    const headers = [
        'Booking ID',
        'Guest Name',
        'Email',
        'Phone',
        'Room Number',
        'Room Type',
        'Floor',
        'Block',
        'Check-In Date',
        'Check-Out Date',
        'Nights',
        'No. of Guests',
        'Purpose',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Method',
        'Booking Status',
        'Checked-In At',
        'Checked-Out At',
        'Special Requests',
        'Created At',
    ];

    const rows = bookings.map((b) => {
        const nights = b.checkIn && b.checkOut
            ? Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (1000 * 60 * 60 * 24))
            : 0;

        return [
            escapeCsvField(b._id),
            escapeCsvField(b.guestName),
            escapeCsvField(b.email),
            escapeCsvField(b.phone),
            escapeCsvField(b.room?.roomNumber || 'N/A'),
            escapeCsvField(b.room?.type || 'N/A'),
            escapeCsvField(b.room?.floor || 'N/A'),
            escapeCsvField(b.room?.block || 'N/A'),
            escapeCsvField(formatDate(b.checkIn)),
            escapeCsvField(formatDate(b.checkOut)),
            escapeCsvField(nights),
            escapeCsvField(b.numberOfGuests),
            escapeCsvField(b.purpose || 'N/A'),
            escapeCsvField(b.totalAmount),
            escapeCsvField(b.paymentStatus),
            escapeCsvField(b.paymentMethod || 'cash'),
            escapeCsvField(b.status),
            escapeCsvField(b.checkedInAt ? formatDateTime(b.checkedInAt) : ''),
            escapeCsvField(b.checkedOutAt ? formatDateTime(b.checkedOutAt) : ''),
            escapeCsvField(b.specialRequests || ''),
            escapeCsvField(formatDateTime(b.createdAt)),
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
}

/**
 * Build a MongoDB query from export filter parameters.
 */
export function buildExportQuery({ startDate, endDate, status, paymentStatus }) {
    const query = { isActive: true };

    if (startDate || endDate) {
        query.checkIn = {};
        if (startDate) query.checkIn.$gte = new Date(startDate);
        if (endDate) query.checkIn.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    return query;
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function escapeCsvField(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
