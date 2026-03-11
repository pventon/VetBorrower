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
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface MenuBarProps {
    onUserAccounts: () => void;
    onSystemSettings: () => void;
}

export default function MenuBar({ onUserAccounts, onSystemSettings }: MenuBarProps) {
    const { hasRole } = useAuth();
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!hasRole("admin")) return null;

    return (
        <nav className="menu-bar" ref={menuRef}>
            <div className="menu-item">
                <button
                    className={`menu-button ${openMenu === "settings" ? "active" : ""}`}
                    onClick={() => setOpenMenu(openMenu === "settings" ? null : "settings")}
                >
                    Settings
                </button>
                {openMenu === "settings" && (
                    <div className="menu-dropdown">
                        <button
                            className="menu-dropdown-item"
                            onClick={() => { onUserAccounts(); setOpenMenu(null); }}
                        >
                            User Accounts...
                        </button>
                        <button
                            className="menu-dropdown-item"
                            onClick={() => { onSystemSettings(); setOpenMenu(null); }}
                        >
                            System Settings...
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
