'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [confirmationResult, setConfirmationResult] = useState(null);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.auth.getMe();
            setUser(res.data.user);
        } catch {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (email, password, twoFactorCode) => {
        const res = await api.auth.login({ email, password, twoFactorCode });
        if (res.twoFactorRequired) return { twoFactorRequired: true };
        localStorage.setItem('token', res.data.token);
        if (res.data.sessionToken) localStorage.setItem('sessionToken', res.data.sessionToken);
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

    // --- Firebase Phone Auth ---

    const setupRecaptcha = (containerId) => {
        if (recaptchaVerifier) recaptchaVerifier.clear();

        const verifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => { console.log('Recaptcha solved'); }
        });
        setRecaptchaVerifier(verifier);
        return verifier;
    };

    const requestPhoneOtp = async (phoneNumber, containerId) => {
        const verifier = setupRecaptcha(containerId);
        // Firebase expects international format (+91...)
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
        const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        setConfirmationResult(result);
        return result;
    };

    const verifyFirebaseOtp = async (otp) => {
        if (!confirmationResult) throw new Error('No OTP request found. Please send OTP first.');

        // 1. Verify OTP with Firebase
        const result = await confirmationResult.confirm(otp);
        const idToken = await result.user.getIdToken();

        // 2. Verify Firebase ID Token with our Backend
        const res = await api.auth.verifyPhoneToken(idToken);

        if (res.isNewUser) {
            // New user, return for completion
            return { isNewUser: true, phone: res.phone };
        }

        // Existing user, log them in
        localStorage.setItem('token', res.data.token);
        if (res.data.sessionToken) localStorage.setItem('sessionToken', res.data.sessionToken);
        await loadUser();
        return res.data.user;
    };

    const registerWithPhone = async (data) => {
        const res = await api.auth.registerWithPhone(data);
        localStorage.setItem('token', res.data.token);
        await loadUser();
        return res.data.user;
    };

    return (
        <AuthContext.Provider value={{
            user, loading, login, register, logout, updateProfile, loadUser,
            requestPhoneOtp, verifyFirebaseOtp, registerWithPhone
        }}>
            {children}
            <div id="recaptcha-container"></div>
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
