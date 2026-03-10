'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.auth.getMe();
            setUser(res.data.user);
        } catch (err) {
            // Only auto-logout if token is definitively invalid
            if (err.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('sessionToken');
                setUser(null);
            }
            console.error('Failed to load user:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (email, password, twoFactorCode) => {
        const res = await api.auth.login({ email, password, twoFactorCode });
        // if server indicates 2FA is required before issuing token
        if (res.twoFactorRequired) {
            return { twoFactorRequired: true };
        }
        // store token and session fingerprint
        localStorage.setItem('token', res.data.token);
        if (res.data.sessionToken) {
            localStorage.setItem('sessionToken', res.data.sessionToken);
        }
        // res.data.user will now include twoFactorEnabled etc from backend but we still reload to be safe
        await loadUser();
        return res.data.user;
    };

    const register = async (data) => {
        const res = await api.auth.register(data);
        localStorage.setItem('token', res.data.token);
        await loadUser();
        return res.data.user;
    };

    const logout = async () => {
        try { await api.auth.logout(); } catch { }
        localStorage.removeItem('token');
        localStorage.removeItem('sessionToken');
        setUser(null);
    };

    const updateProfile = async (data) => {
        const res = await api.auth.updateProfile(data);
        setUser(res.data.user);
        return res.data.user;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, loadUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
