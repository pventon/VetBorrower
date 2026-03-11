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
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import type { SettingsRecord, IndustryType, UsState, UserRole } from "../types/settingsRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface SystemSettingsDialogProps {
    onClose: () => void;
}

type TabName = "general" | "industryTypes" | "usStates" | "userRoles";

export default function SystemSettingsDialog({ onClose }: SystemSettingsDialogProps) {
    const { token, hasRole } = useAuth();
    const { settings, refreshSettings } = useSettings();
    const [activeTab, setActiveTab] = useState<TabName>("general");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // General settings
    const [serverPort, setServerPort] = useState(0);
    const [rateLimitPerSecond, setRateLimitPerSecond] = useState(0);
    const [paginationValues, setPaginationValues] = useState("");

    // Array settings
    const [industryTypes, setIndustryTypes] = useState<IndustryType[]>([]);
    const [usStates, setUsStates] = useState<UsState[]>([]);
    const [userRoles, setUserRoles] = useState<UserRole[]>([]);

    useEffect(() => {
        if (settings) {
            setServerPort(settings.serverPort);
            setRateLimitPerSecond(settings.rateLimitPerSecond);
            setPaginationValues(settings.guiPaginationValues.join(", "));
            setIndustryTypes([...settings.industryTypes]);
            setUsStates([...settings.usStates]);
            setUserRoles([...settings.userRoles]);
        }
    }, [settings]);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const handleSave = async () => {
        if (!settings) return;
        setError(null);
        setSuccess(null);

        const parsedPagination = paginationValues
            .split(",")
            .map((v) => parseInt(v.trim(), 10))
            .filter((v) => !isNaN(v));

        const body: Partial<SettingsRecord> = {
            serverPort,
            rateLimitPerSecond,
            guiPaginationValues: parsedPagination,
            industryTypes,
            usStates,
            userRoles,
        };

        try {
            const res = await fetch(`${API_BASE}/api/settings/${settings._id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update settings");
            }
            setSuccess("Settings saved successfully.");
            await refreshSettings();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        }
    };

    // Industry type helpers
    const addIndustryType = () => setIndustryTypes([...industryTypes, { type: "", sic: 0 }]);
    const removeIndustryType = (i: number) => setIndustryTypes(industryTypes.filter((_, idx) => idx !== i));
    const updateIndustryType = (i: number, field: keyof IndustryType, value: string | number) => {
        const updated = [...industryTypes];
        updated[i] = { ...updated[i], [field]: value };
        setIndustryTypes(updated);
    };

    // US state helpers
    const addUsState = () => setUsStates([...usStates, { acronym: "", fullname: "" }]);
    const removeUsState = (i: number) => setUsStates(usStates.filter((_, idx) => idx !== i));
    const updateUsState = (i: number, field: keyof UsState, value: string) => {
        const updated = [...usStates];
        updated[i] = { ...updated[i], [field]: value };
        setUsStates(updated);
    };

    // User role helpers
    const addUserRole = () => setUserRoles([...userRoles, { role: "", description: "" }]);
    const removeUserRole = (i: number) => setUserRoles(userRoles.filter((_, idx) => idx !== i));
    const updateUserRole = (i: number, field: keyof UserRole, value: string) => {
        const updated = [...userRoles];
        updated[i] = { ...updated[i], [field]: value };
        setUserRoles(updated);
    };

    const tabs: { key: TabName; label: string }[] = [
        { key: "general", label: "General" },
        { key: "industryTypes", label: "Industry Types" },
        { key: "usStates", label: "US States" },
        ...(hasRole("root") ? [{ key: "userRoles" as TabName, label: "User Roles" }] : []),
    ];

    return (
        <div className="dialog-overlay">
            <div className="dialog dialog-wide">
                <div className="dialog-header">
                    <h2>System Settings</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}
                {success && <div className="dialog-success">{success}</div>}

                <div className="dialog-body">
                    <div className="settings-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="settings-tab-content">
                        {activeTab === "general" && (
                            <div>
                                <div className="form-row">
                                    <label>Server Port</label>
                                    <input
                                        type="number"
                                        value={serverPort}
                                        onChange={(e) => setServerPort(parseInt(e.target.value, 10) || 0)}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Rate Limit (per second)</label>
                                    <input
                                        type="number"
                                        value={rateLimitPerSecond}
                                        onChange={(e) => setRateLimitPerSecond(parseInt(e.target.value, 10) || 0)}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Pagination Values (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={paginationValues}
                                        onChange={(e) => setPaginationValues(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "industryTypes" && (
                            <div>
                                <button className="btn btn-sm" onClick={addIndustryType}>Add Industry Type</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>SIC Code</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {industryTypes.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.type}
                                                        onChange={(e) => updateIndustryType(i, "type", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.sic}
                                                        onChange={(e) => updateIndustryType(i, "sic", parseInt(e.target.value, 10) || 0)}
                                                    />
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => removeIndustryType(i)}>Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "usStates" && (
                            <div>
                                <button className="btn btn-sm" onClick={addUsState}>Add State</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Acronym</th>
                                            <th>Full Name</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usStates.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.acronym}
                                                        onChange={(e) => updateUsState(i, "acronym", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.fullname}
                                                        onChange={(e) => updateUsState(i, "fullname", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => removeUsState(i)}>Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "userRoles" && (
                            <div>
                                <button className="btn btn-sm" onClick={addUserRole}>Add Role</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Role</th>
                                            <th>Description</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userRoles.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.role}
                                                        onChange={(e) => updateUserRole(i, "role", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateUserRole(i, "description", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => removeUserRole(i)}>Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>

                <div className="dialog-footer">
                    <button className="btn btn-primary" onClick={handleSave}>Save</button>
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
