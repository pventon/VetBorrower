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
import type { SettingsRecord, IndustryType, UsState, UserRole, ExpenseCategory, FeeCategory } from "../types/settingsRecord";
import type { FunderRecord } from "../types/funderRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface SystemSettingsDialogProps {
    onClose: () => void;
}

type TabName = "general" | "industryTypes" | "usStates" | "userRoles" | "funders" | "expenseCategories" | "feeCategories";

export default function SystemSettingsDialog({ onClose }: SystemSettingsDialogProps) {
    const { token, hasRole, user: currentUser } = useAuth();
    const isRoot = hasRole("root");
    const { settings, refreshSettings } = useSettings();
    const [activeTab, setActiveTab] = useState<TabName>(hasRole("root") ? "general" : "industryTypes");
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

    // Funders (separate collection)
    const [fundersList, setFundersList] = useState<FunderRecord[]>([]);
    const [editingFunderId, setEditingFunderId] = useState<string | null>(null);
    const [funderFormName, setFunderFormName] = useState("");
    const [isAddingFunder, setIsAddingFunder] = useState(false);
    const [funderFormOffice, setFunderFormOffice] = useState("");
    const [officeAcronyms, setOfficeAcronyms] = useState<string[]>([]);

    // Expense & Fee Categories (stored in settings arrays)
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);

    useEffect(() => {
        if (settings) {
            setServerPort(settings.serverPort);
            setRateLimitPerSecond(settings.rateLimitPerSecond);
            setPaginationValues(settings.guiPaginationValues.join(", "));
            setIndustryTypes([...settings.industryTypes]);
            setUsStates([...settings.usStates]);
            setUserRoles([...settings.userRoles]);
            setExpenseCategories([...(settings.expenseCategories || [])]);
            setFeeCategories([...(settings.feeCategories || [])]);
        }
    }, [settings]);

    const fetchFunders = async () => {
        try {
            const url = isRoot ? `${API_BASE}/api/funder` : `${API_BASE}/api/funder?officeAcronym=${currentUser?.officeAcronym}`;
            const res = await fetch(url, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
            if (res.ok) setFundersList(await res.json());
        } catch { /* ignore */ }
    };

    const fetchOfficeAcronyms = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/office/acronyms`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
            if (res.ok) setOfficeAcronyms(await res.json());
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchFunders(); if (isRoot) fetchOfficeAcronyms(); }, []);

    const handleAddFunder = async () => {
        if (!funderFormName.trim()) return;
        const office = isRoot ? funderFormOffice : (currentUser?.officeAcronym ?? "");
        if (!office) { setError("An office must be selected."); return; }
        try {
            const res = await fetch(`${API_BASE}/api/funder`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ funderName: funderFormName, officeAcronym: office }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add funder"); }
            setFunderFormName("");
            setIsAddingFunder(false);
            setFunderFormOffice("");
            await fetchFunders();
            setSuccess("Funder added successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add funder");
        }
    };

    const handleUpdateFunder = async () => {
        if (!editingFunderId || !funderFormName.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/api/funder/${editingFunderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ funderName: funderFormName, officeAcronym: isRoot ? funderFormOffice : (currentUser?.officeAcronym ?? "") }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update funder"); }
            setEditingFunderId(null);
            setFunderFormName("");
            setFunderFormOffice("");
            await fetchFunders();
            setSuccess("Funder updated successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update funder");
        }
    };

    const handleDeleteFunder = async (id: string) => {
        if (!confirm("Delete this funder?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/funder/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to delete funder");
            await fetchFunders();
            setSuccess("Funder deleted successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete funder");
        }
    };

    // Expense category helpers (settings array)
    const addExpenseCategory = () => setExpenseCategories([...expenseCategories, { category: "", officeAcronym: isRoot ? "" : (currentUser?.officeAcronym ?? "") }]);
    const removeExpenseCategory = (i: number) => setExpenseCategories(expenseCategories.filter((_, idx) => idx !== i));
    const updateExpenseCategory = (i: number, field: keyof ExpenseCategory, value: string) => {
        const updated = [...expenseCategories];
        updated[i] = { ...updated[i], [field]: value };
        setExpenseCategories(updated);
    };

    // Fee category helpers (settings array)
    const addFeeCategory = () => setFeeCategories([...feeCategories, { category: "", officeAcronym: isRoot ? "" : (currentUser?.officeAcronym ?? "") }]);
    const removeFeeCategory = (i: number) => setFeeCategories(feeCategories.filter((_, idx) => idx !== i));
    const updateFeeCategory = (i: number, field: keyof FeeCategory, value: string) => {
        const updated = [...feeCategories];
        updated[i] = { ...updated[i], [field]: value };
        setFeeCategories(updated);
    };

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
            expenseCategories,
            feeCategories,
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
        ...(hasRole("root") ? [{ key: "general" as TabName, label: "General" }] : []),
        { key: "industryTypes", label: "Industry Types" },
        { key: "usStates", label: "US States" },
        { key: "funders", label: "Funders" },
        { key: "expenseCategories", label: "Expense Categories" },
        { key: "feeCategories", label: "Fee Categories" },
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

                        {activeTab === "funders" && (
                            <div>
                                <button className="btn btn-sm" onClick={() => { setIsAddingFunder(true); setFunderFormName(""); setFunderFormOffice(isRoot ? "" : (currentUser?.officeAcronym ?? "")); }} disabled={isAddingFunder || editingFunderId !== null}>Add Funder</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Funder Name</th>
                                            {isRoot && <th>Office</th>}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fundersList.map((f) => (
                                            editingFunderId === f._id ? (
                                                <tr key={f._id}>
                                                    <td>
                                                        <input type="text" value={funderFormName} onChange={(e) => setFunderFormName(e.target.value)} style={{ width: "100%" }} />
                                                    </td>
                                                    {isRoot && (
                                                        <td>
                                                            <select value={funderFormOffice} onChange={(e) => setFunderFormOffice(e.target.value)} style={{ width: "100%" }}>
                                                                <option value="">-- Select --</option>
                                                                {officeAcronyms.map(a => <option key={a} value={a}>{a}</option>)}
                                                            </select>
                                                        </td>
                                                    )}
                                                    <td>
                                                        <button className="btn btn-sm btn-primary" onClick={handleUpdateFunder}>Save</button>
                                                        <button className="btn btn-sm" onClick={() => { setEditingFunderId(null); setFunderFormName(""); setFunderFormOffice(""); }}>Cancel</button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={f._id}>
                                                    <td>{f.funderName}</td>
                                                    {isRoot && <td>{f.officeAcronym || "-"}</td>}
                                                    <td>
                                                        <button className="btn btn-sm btn-success" onClick={() => { setEditingFunderId(f._id); setFunderFormName(f.funderName); setFunderFormOffice(f.officeAcronym || ""); }} disabled={isAddingFunder || editingFunderId !== null}>Edit</button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteFunder(f._id)} disabled={isAddingFunder || editingFunderId !== null}>Delete</button>
                                                    </td>
                                                </tr>
                                            )
                                        ))}
                                        {isAddingFunder && (
                                            <tr>
                                                <td>
                                                    <input type="text" placeholder="Enter funder name" value={funderFormName} onChange={(e) => setFunderFormName(e.target.value)} style={{ width: "100%" }} />
                                                </td>
                                                {isRoot && (
                                                    <td>
                                                        <select value={funderFormOffice} onChange={(e) => setFunderFormOffice(e.target.value)} style={{ width: "100%" }}>
                                                            <option value="">-- Select --</option>
                                                            {officeAcronyms.map(a => <option key={a} value={a}>{a}</option>)}
                                                        </select>
                                                    </td>
                                                )}
                                                <td>
                                                    <button className="btn btn-sm btn-primary" onClick={handleAddFunder}>Save</button>
                                                    <button className="btn btn-sm" onClick={() => { setIsAddingFunder(false); setFunderFormName(""); setFunderFormOffice(""); }}>Cancel</button>
                                                </td>
                                            </tr>
                                        )}
                                        {fundersList.length === 0 && !isAddingFunder && (
                                            <tr><td colSpan={isRoot ? 3 : 2} className="empty-row">No funders configured</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "expenseCategories" && (
                            <div>
                                <button className="btn btn-sm" onClick={addExpenseCategory}>Add Expense Category</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            {isRoot && <th>Office</th>}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenseCategories.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <input type="text" value={item.category} onChange={(e) => updateExpenseCategory(i, "category", e.target.value)} />
                                                </td>
                                                {isRoot && (
                                                    <td>
                                                        <select value={item.officeAcronym || ""} onChange={(e) => updateExpenseCategory(i, "officeAcronym", e.target.value)}>
                                                            <option value="">-- Select --</option>
                                                            {officeAcronyms.map(a => <option key={a} value={a}>{a}</option>)}
                                                        </select>
                                                    </td>
                                                )}
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => removeExpenseCategory(i)}>Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "feeCategories" && (
                            <div>
                                <button className="btn btn-sm" onClick={addFeeCategory}>Add Fee Category</button>
                                <table className="dialog-table settings-array-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            {isRoot && <th>Office</th>}
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feeCategories.map((item, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <input type="text" value={item.category} onChange={(e) => updateFeeCategory(i, "category", e.target.value)} />
                                                </td>
                                                {isRoot && (
                                                    <td>
                                                        <select value={item.officeAcronym || ""} onChange={(e) => updateFeeCategory(i, "officeAcronym", e.target.value)}>
                                                            <option value="">-- Select --</option>
                                                            {officeAcronyms.map(a => <option key={a} value={a}>{a}</option>)}
                                                        </select>
                                                    </td>
                                                )}
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => removeFeeCategory(i)}>Remove</button>
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
