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
import type { UserAccountRecord } from "../types/userAccountRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface UserAccountsDialogProps {
    onClose: () => void;
}

interface UserFormData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    officeAcronym: string;
    isActive: boolean;
}

const DEFAULT_ADMIN_EMAIL = "root@vetborrower.com";

const emptyForm: UserFormData = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
    officeAcronym: "",
    isActive: true,
};

export default function UserAccountsDialog({ onClose }: UserAccountsDialogProps) {
    const { token, hasRole, user: currentUser } = useAuth();
    const isRoot = hasRole("root");
    const { settings } = useSettings();
    const [users, setUsers] = useState<UserAccountRecord[]>([]);
    const [officeAcronyms, setOfficeAcronyms] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserAccountRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<UserFormData>(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/useraccount`, { headers });
            if (!res.ok) throw new Error("Failed to fetch users");
            setUsers(await res.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load users");
        }
    };

    const fetchOfficeAcronyms = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/office/acronyms`, { headers });
            if (res.ok) setOfficeAcronyms(await res.json());
        } catch {
            // non-fatal — office list just stays empty
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchOfficeAcronyms();
    }, []);

    // Roles available in the dropdown — non-root users cannot see or assign 'root'
    const availableRoles = settings?.userRoles?.filter(
        (r) => isRoot || r.role !== "root"
    ) ?? [];

    const displayedUsers = isRoot
        ? users
        : users.filter((u) => u.officeAcronym === currentUser?.officeAcronym);

    const startAdd = () => {
        setEditingUser(null);
        setFormData(emptyForm);
        setFormError(null);
        setIsAdding(true);
    };

    const startEdit = (user: UserAccountRecord) => {
        setIsAdding(false);
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: "",
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            officeAcronym: user.officeAcronym ?? "",
            isActive: user.isActive,
        });
        setFormError(null);
    };

    const cancelForm = () => {
        setEditingUser(null);
        setIsAdding(false);
        setFormError(null);
    };

    const handleSave = async () => {
        setFormError(null);

        if (!formData.email || !formData.firstName || !formData.lastName) {
            setFormError("Email, first name, and last name are required.");
            return;
        }

        if (isAdding && !formData.password) {
            setFormError("Password is required for new accounts.");
            return;
        }

        if (!formData.officeAcronym) {
            setFormError("An office must be assigned.");
            return;
        }

        try {
            const body: Record<string, unknown> = { ...formData };
            if (!body.password) delete body.password;

            if (isAdding) {
                const res = await fetch(`${API_BASE}/api/useraccount`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to add user");
                }
            } else if (editingUser) {
                const res = await fetch(`${API_BASE}/api/useraccount/${editingUser._id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to update user");
                }
            }

            cancelForm();
            await fetchUsers();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const handleDelete = async (user: UserAccountRecord) => {
        if (!confirm(`Delete user ${user.email}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/useraccount/${user._id}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error("Failed to delete user");
            cancelForm();
            await fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const showForm = editingUser !== null;

    const formFields = (isAddMode: boolean) => (
        <>
            <div className="form-row">
                <label>Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoFocus
                />
            </div>
            <div className="form-row">
                <label>{isAddMode ? "Password" : "Password (leave blank to keep)"}</label>
                <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
            </div>
            <div className="form-row">
                <label>First Name</label>
                <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
            </div>
            <div className="form-row">
                <label>Last Name</label>
                <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
            </div>
            <div className="form-row">
                <label>Role</label>
                <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                    {availableRoles.map((r) => (
                        <option key={r.role} value={r.role}>{r.role}</option>
                    ))}
                </select>
            </div>
            <div className="form-row">
                <label>Office</label>
                <select
                    value={formData.officeAcronym}
                    onChange={(e) => setFormData({ ...formData, officeAcronym: e.target.value })}
                >
                    <option value="">-- Select Office --</option>
                    {officeAcronyms.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>
            <div className="form-row">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                </label>
            </div>
        </>
    );

    return (
        <>
            <div className="dialog-overlay">
                <div className="dialog">
                    <div className="dialog-header">
                        <h2>User Accounts</h2>
                        <button className="dialog-close" onClick={onClose}>&times;</button>
                    </div>

                    {error && <div className="dialog-error">{error}</div>}

                    <div className="dialog-body">
                        <div className="dialog-toolbar">
                            <button className="btn" onClick={startAdd} disabled={isAdding || showForm}>Add User</button>
                        </div>

                        <table className="dialog-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    {isRoot && <th>Office</th>}
                                    <th>Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedUsers.map((user) => (
                                    <tr key={user._id} className={editingUser?._id === user._id ? "selected-row" : ""} onDoubleClick={() => startEdit(user)}>
                                        <td>{user.email}</td>
                                        <td>{user.firstName} {user.lastName}</td>
                                        <td>{user.role}</td>
                                        {isRoot && <td>{user.officeAcronym}</td>}
                                        <td>{user.isActive ? "Yes" : "No"}</td>
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-success" onClick={() => startEdit(user)} disabled={isAdding || showForm}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user)} disabled={isAdding || showForm || user.email === DEFAULT_ADMIN_EMAIL}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {displayedUsers.length === 0 && (
                                    <tr><td colSpan={isRoot ? 6 : 5} className="empty-row">No user accounts found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="dialog-overlay" style={{ zIndex: 2001 }}>
                    <div className="dialog">
                        <div className="dialog-header">
                            <h2>Edit User</h2>
                            <button className="dialog-close" onClick={cancelForm}>&times;</button>
                        </div>
                        {formError && <div className="dialog-error">{formError}</div>}
                        <div className="dialog-body">
                            {formFields(false)}
                        </div>
                        <div className="dialog-footer">
                            <button className="btn btn-primary" onClick={handleSave}>Save</button>
                            <button className="btn" onClick={cancelForm}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {isAdding && (
                <div className="dialog-overlay" style={{ zIndex: 2001 }}>
                    <div className="dialog">
                        <div className="dialog-header">
                            <h2>Add User</h2>
                            <button className="dialog-close" onClick={cancelForm}>&times;</button>
                        </div>
                        {formError && <div className="dialog-error">{formError}</div>}
                        <div className="dialog-body">
                            {formFields(true)}
                        </div>
                        <div className="dialog-footer">
                            <button className="btn btn-primary" onClick={handleSave}>Save</button>
                            <button className="btn" onClick={cancelForm}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
