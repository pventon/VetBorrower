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
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const loginError = await login(email, password, rememberMe);
        if (loginError) {
            setError(loginError);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Vet Borrower Application Logon</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                        <input
                            id="rememberMe"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={isSubmitting}
                            style={{ width: "auto" }}
                        />
                        <label htmlFor="rememberMe" style={{ marginBottom: 0 }}>Remember me</label>
                    </div>
                    {error && <div className="login-error">{error}</div>}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
