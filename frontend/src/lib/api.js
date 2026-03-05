const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
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
        refresh: () => request('/auth/refresh', { method: 'POST' }),
        logout: () => request('/auth/logout', { method: 'POST' }),
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
        create: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
        update: (id, body) => request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        delete: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),
        updateStatus: (id, status) => request(`/rooms/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
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
};
