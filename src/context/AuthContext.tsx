/**
 * Copyright (c) 2025 Ventec SW LLC.
 * All rights reserved.
 *
 * This software is the intellectual property of Ventec SW LLC. Permission is
 * hereby denied for any use, copying, modification, distribution, or
 * transmission of this software and its design paradigm, in whole or in
 * part, without the prior written permission of Ventec SW LLC.
 *
 * No part of this source code may be copied, reproduced, distributed,
 * or transmitted in any form or by any means, electronic or mechanical,
 * without the prior written permission of the copyright holder, nor
 * shall it be used for any purpose other than in connection with an
 * agreement or proposed agreement with Ventec SW LLC.
 */
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { UserAccountRecord } from "../types/userAccountRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface AuthContextType {
    user: UserAccountRecord | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<string | null>;
    logout: () => void;
    hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserAccountRecord | null>(null);
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("vb_token")
    );
    const [isLoading, setIsLoading] = useState(true);

    // On mount, verify existing token
    useEffect(() => {
        if (token) {
            verifyToken(token);
        } else {
            setIsLoading(false);
        }
    }, []);

    const verifyToken = async (existingToken: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${existingToken}` },
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setToken(existingToken);
            } else {
                // Token is invalid or expired
                localStorage.removeItem("vb_token");
                setToken(null);
                setUser(null);
            }
        } catch {
            localStorage.removeItem("vb_token");
            setToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (
        email: string,
        password: string
    ): Promise<string | null> => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return data.error || "Login failed.";
            }

            localStorage.setItem("vb_token", data.token);
            setToken(data.token);
            setUser(data.user);
            return null; // null = no error
        } catch {
            return "Network error. Unable to connect to server.";
        }
    };

    const logout = () => {
        localStorage.removeItem("vb_token");
        setToken(null);
        setUser(null);
    };

    const hasRole = (...roles: string[]) => {
        return user !== null && roles.includes(user.role);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: user !== null,
                isLoading,
                login,
                logout,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
