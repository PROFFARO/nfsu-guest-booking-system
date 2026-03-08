const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // If token expired or invalid, auto-logout
        if (res.status === 401 && token) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login if we're in the browser
            if (typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
                window.location.href = '/login?expired=true';
            }
        }
        const error = new Error(data.message || 'Something went wrong');
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

// Auth
export const api = {
    auth: {
        register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
        login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
        getMe: () => request('/auth/me'),
        updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
        changePassword: (body) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
        forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
        resetPassword: (token, body) => request(`/auth/reset-password/${token}`, { method: 'PUT', body: JSON.stringify(body) }),
        refresh: () => request('/auth/refresh', { method: 'POST' }),
        logout: () => request('/auth/logout', { method: 'POST' }),
        // two-factor authentication
        setup2fa: () => request('/auth/2fa/setup', { method: 'POST' }),
        verify2fa: (body) => request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify(body) }),
        // Login history & sessions
        loginHistory: (limit = 20) => request(`/auth/login-history?limit=${limit}`),
        sessions: () => request('/auth/sessions'),
        revokeSession: (id) => request(`/auth/sessions/${id}`, { method: 'DELETE' }),
        revokeAllSessions: () => request('/auth/sessions', { method: 'DELETE' }),
    },


    rooms: {
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/rooms${qs ? `?${qs}` : ''}`);
        },
        getById: (id) => request(`/rooms/${id}`),
        stats: () => request('/rooms/stats'),
        floors: () => request('/rooms/floors'),
        availability: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/rooms/availability${qs ? `?${qs}` : ''}`);
        },
        create: (data) => {
            const isFormData = data instanceof FormData;
            return request('/rooms', { method: 'POST', body: isFormData ? data : JSON.stringify(data) });
        },
        update: (id, data) => {
            const isFormData = data instanceof FormData;
            return request(`/rooms/${id}`, { method: 'PUT', body: isFormData ? data : JSON.stringify(data) });
        },
        delete: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),
        updateStatus: (id, status) => request(`/rooms/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
        scheduleMaintenance: (id, body) => request(`/rooms/${id}/maintenance`, { method: 'POST', body: JSON.stringify(body) }),
        clearMaintenance: (id) => request(`/rooms/${id}/maintenance`, { method: 'DELETE' }),
    },

    bookings: {
        create: (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/bookings${qs ? `?${qs}` : ''}`);
        },
        getById: (id) => request(`/bookings/${id}`),
        update: (id, body) => request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        updateStatus: (id, body) => request(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
        updatePayment: (id, paymentStatus) => request(`/bookings/${id}/payment`, { method: 'PUT', body: JSON.stringify({ paymentStatus }) }),
        cancel: (id, reason) => request(`/bookings/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
        markPaid: (id) => request(`/bookings/${id}/mark-paid`, { method: 'POST' }),
        downloadInvoice: async (id) => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${API_BASE}/bookings/${id}/invoice`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to download invoice');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFSU_Invoice_${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        checkin: (id) => request(`/bookings/${id}/checkin`, { method: 'POST' }),
        checkout: (id) => request(`/bookings/${id}/checkout`, { method: 'POST' }),
        export: async (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${API_BASE}/bookings/export${qs ? `?${qs}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to export bookings');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFSU_Bookings_Report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        scanGatepass: (token) => request('/bookings/scan-gatepass', { method: 'POST', body: JSON.stringify({ token }) }),
    },

    users: {
        list: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/users${qs ? `?${qs}` : ''}`);
        },
        getById: (id) => request(`/users/${id}`),
        update: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        deactivate: (id) => request(`/users/${id}`, { method: 'DELETE' }),
        activate: (id) => request(`/users/${id}/activate`, { method: 'PUT' }),
        resetPassword: (id, newPassword) => request(`/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
        stats: () => request('/users/stats'),
    },

    reviews: {
        create: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
        update: (bookingId, body) => request(`/reviews/${bookingId}`, { method: 'PUT', body: JSON.stringify(body) }),
        getAll: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/reviews${qs ? `?${qs}` : ''}`);
        },
        getByRoom: (roomId) => request(`/reviews/room/${roomId}`),
        checkStatus: (bookingId) => request(`/reviews/check/${bookingId}`),
    },

    auditLogs: {
        get: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/audit-logs${qs ? `?${qs}` : ''}`);
        },
        getAll: (params = {}) => {
            const qs = new URLSearchParams(params).toString();
            return request(`/audit-logs/all${qs ? `?${qs}` : ''}`);
        }
    },
    chats: {
        getMyThread: () => request('/chats/my-thread'),
        sendMessage: (data) => request('/chats/message', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getAdminInbox: () => request('/chats/admin/inbox'),
        getMessages: (threadId) => request(`/chats/${threadId}/messages`),
        // AI Specific
        getAIThreads: () => request('/chats/ai/threads'),
        createAIThread: () => request('/chats/ai/threads', { method: 'POST' }),
        deleteAIThread: (id) => request(`/chats/ai/threads/${id}`, { method: 'DELETE' }),
        aiChat: (data) => request('/chats/ai', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
    faq: {
        list: () => request('/faq'),
        create: (data) => request('/faq', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id, data) => request(`/faq/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id) => request(`/faq/${id}`, { method: 'DELETE' }),
    }
};
