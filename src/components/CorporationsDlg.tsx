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
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import type { CorporationRecord } from "../types/corporationRecord";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapboxContext {
    id: string;
    text: string;
    short_code?: string;
}

interface MapboxFeature {
    id: string;
    place_name: string;
    text: string;
    address?: string;
    context?: MapboxContext[];
}

interface AddressSearchProps {
    value: string;
    onChange: (street: string) => void;
    onSelect: (street: string, city: string, state: string, zip: string) => void;
}

function AddressSearch({ value, onChange, onSelect }: AddressSearchProps) {
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleChange = (text: string) => {
        onChange(text);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (text.length < 3) { setSuggestions([]); setOpen(false); return; }
        timerRef.current = setTimeout(async () => {
            try {
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json`
                    + `?access_token=${MAPBOX_TOKEN}&country=US&types=address&limit=6`;
                const res = await fetch(url);
                const data = await res.json();
                setSuggestions(data.features ?? []);
                setOpen((data.features?.length ?? 0) > 0);
            } catch {
                setSuggestions([]);
            }
        }, 350);
    };

    const handleSelect = (feature: MapboxFeature) => {
        const street = [feature.address, feature.text].filter(Boolean).join(" ");
        const ctx = feature.context ?? [];
        const zip = ctx.find(c => c.id.startsWith("postcode"))?.text ?? "";
        const city = ctx.find(c => c.id.startsWith("place"))?.text ?? "";
        const regionCode = ctx.find(c => c.id.startsWith("region"))?.short_code ?? "";
        const stateAcronym = regionCode.replace(/^US-/, "");
        onSelect(street, city, stateAcronym, zip);
        setSuggestions([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: "relative" }}>
            <input
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                autoComplete="off"
                placeholder="Start typing an address…"
            />
            {open && suggestions.length > 0 && (
                <ul style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                    background: "var(--color-bg, #fff)", border: "1px solid var(--color-border, #ccc)",
                    borderRadius: "4px", margin: 0, padding: 0, listStyle: "none",
                    maxHeight: "220px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                    {suggestions.map((f) => (
                        <li
                            key={f.id}
                            onMouseDown={() => handleSelect(f)}
                            style={{
                                padding: "6px 10px", cursor: "pointer", fontSize: "0.85rem",
                                borderBottom: "1px solid var(--color-border, #eee)"
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--color-hover, #f0f0f0)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                            {f.place_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface CorporationsDlgProps {
    onClose: () => void;
}

interface OwnerFormData {
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    ethnicity: string;
}

interface AddressFormData {
    streetName: string;
    city: string;
    state: string;
    zip: string;
}

interface CorpFormData {
    businessName: string;
    dbaName: string;
    percentOfOwnership: number;
    timeInBusiness: number;
    lengthOfOwnership: number;
    dob: string;
    ficoScore: number;
    stateOfTheBusiness: string;
    industryType: string;
    businessAddress: AddressFormData;
    homeAddress: AddressFormData;
    owners: OwnerFormData[];
}

type TabName = "general" | "owner" | "business-address" | "home-address";

const emptyAddress: AddressFormData = { streetName: "", city: "", state: "", zip: "" };
const emptyOwner: OwnerFormData = { ownerName: "", ownerPhone: "", ownerEmail: "", ethnicity: "" };
const emptyForm: CorpFormData = {
    businessName: "", dbaName: "", percentOfOwnership: 0,
    timeInBusiness: 0, lengthOfOwnership: 0, dob: "", ficoScore: 0,
    stateOfTheBusiness: "", industryType: "",
    businessAddress: { ...emptyAddress }, homeAddress: { ...emptyAddress },
    owners: [{ ...emptyOwner }],
};

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const tabs: { key: TabName; label: string }[] = [
    { key: "general", label: "General" },
    { key: "owner", label: "Owner" },
    { key: "business-address", label: "Business Address" },
    { key: "home-address", label: "Home Address" },
];

export default function CorporationsDlg({ onClose }: CorporationsDlgProps) {
    const { token } = useAuth();
    const { settings } = useSettings();
    const [corporations, setCorporations] = useState<CorporationRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingCorp, setEditingCorp] = useState<CorporationRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<CorpFormData>({ ...emptyForm, businessAddress: { ...emptyAddress }, homeAddress: { ...emptyAddress } });
    const [formError, setFormError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabName>("general");

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const fetchCorporations = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/corporation`, { headers });
            if (!res.ok) throw new Error("Failed to fetch corporations");
            setCorporations(await res.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load corporations");
        }
    };

    useEffect(() => {
        fetchCorporations();
    }, []);

    const startAdd = () => {
        setEditingCorp(null);
        setFormData({ ...emptyForm, businessAddress: { ...emptyAddress }, homeAddress: { ...emptyAddress }, owners: [{ ...emptyOwner }] });
        setFormError(null);
        setActiveTab("general");
        setIsAdding(true);
    };

    const startEdit = (corp: CorporationRecord) => {
        setIsAdding(false);
        setEditingCorp(corp);
        const owners = (corp.ownerDetails ?? []).map(o => ({
            ownerName: o.ownerName?.[0] ?? "",
            ownerPhone: o.ownerPhone?.[0] ?? "",
            ownerEmail: o.ownerEmail?.[0] ?? "",
            ethnicity: o.ethnicity ?? "",
        }));
        setFormData({
            businessName: corp.businessName ?? "",
            dbaName: corp.dbaName ?? "",
            percentOfOwnership: corp.percentOfOwnership ?? 0,
            timeInBusiness: corp.timeInBusiness ?? 0,
            lengthOfOwnership: corp.lengthOfOwnership ?? 0,
            dob: corp.dob ?? "",
            ficoScore: corp.ficoScore ?? 0,
            stateOfTheBusiness: corp.stateOfTheBusiness ?? "",
            industryType: corp.industryType ?? "",
            businessAddress: corp.businessAddress
                ? { ...corp.businessAddress }
                : { ...emptyAddress },
            homeAddress: corp.homeAddress
                ? { ...corp.homeAddress }
                : { ...emptyAddress },
            owners: owners.length > 0 ? owners : [{ ...emptyOwner }],
        });
        setFormError(null);
        setActiveTab("general");
    };

    const cancelForm = () => {
        setEditingCorp(null);
        setIsAdding(false);
        setFormError(null);
    };

    const handleSave = async () => {
        setFormError(null);

        if (!formData.businessName) {
            setFormError("Business name is required.");
            return;
        }

        const body: Record<string, unknown> = {
            ...formData,
            owners: undefined,
            ownerDetails: formData.owners.map(o => ({
                ownerName: o.ownerName ? [o.ownerName] : [],
                ownerPhone: o.ownerPhone ? [o.ownerPhone] : [],
                ownerEmail: o.ownerEmail ? [o.ownerEmail] : [],
                ethnicity: o.ethnicity,
            })),
        };
        delete body.owners;

        try {
            if (isAdding) {
                const res = await fetch(`${API_BASE}/api/corporation`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to add corporation");
                }
            } else if (editingCorp) {
                const res = await fetch(`${API_BASE}/api/corporation/${editingCorp._id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to update corporation");
                }
            }

            cancelForm();
            await fetchCorporations();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const handleDelete = async (corp: CorporationRecord) => {
        if (!confirm(`Delete corporation ${corp.businessName}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/corporation/${corp._id}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error("Failed to delete corporation");
            cancelForm();
            await fetchCorporations();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const addOwner = () => {
        setFormData({ ...formData, owners: [...formData.owners, { ...emptyOwner }] });
    };

    const removeOwner = (index: number) => {
        const updated = formData.owners.filter((_, i) => i !== index);
        setFormData({ ...formData, owners: updated.length > 0 ? updated : [{ ...emptyOwner }] });
    };

    const updateOwner = (index: number, field: keyof OwnerFormData, value: string) => {
        const updated = formData.owners.map((o, i) => i === index ? { ...o, [field]: value } : o);
        setFormData({ ...formData, owners: updated });
    };

    const showForm = isAdding || editingCorp !== null;

    return (
        <div className="dialog-overlay">
            <div className="dialog dialog-extra-wide">
                <div className="dialog-header">
                    <h2>Corporations</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}

                <div className="dialog-body">
                    <div className="dialog-toolbar">
                        <button className="btn" onClick={startAdd} disabled={showForm}>Add Corporation</button>
                    </div>

                    <table className="dialog-table">
                        <thead>
                            <tr>
                                <th>Business Name</th>
                                <th>DBA</th>
                                <th>Office</th>
                                <th>Industry</th>
                                <th>State</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {corporations.map((corp) => (
                                <tr key={corp._id} className={editingCorp?._id === corp._id ? "selected-row" : ""}>
                                    <td>{corp.businessName}</td>
                                    <td>{corp.dbaName}</td>
                                    <td>{corp.officeAcronym}</td>
                                    <td>{corp.industryType}</td>
                                    <td>{corp.stateOfTheBusiness}</td>
                                    <td className="action-cell">
                                        <button className="btn btn-sm" onClick={() => startEdit(corp)} disabled={showForm}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(corp)} disabled={showForm}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {corporations.length === 0 && (
                                <tr><td colSpan={6} className="empty-row">No corporations found</td></tr>
                            )}
                        </tbody>
                    </table>

                    {showForm && (
                        <div className="dialog-form">
                            <h3>{isAdding ? "Add Corporation" : "Edit Corporation"}</h3>
                            {formError && <div className="dialog-error">{formError}</div>}

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
                                            <label>Business Name</label>
                                            <input
                                                type="text"
                                                value={formData.businessName}
                                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-row">
                                            <label>DBA Name</label>
                                            <input
                                                type="text"
                                                value={formData.dbaName}
                                                onChange={(e) => setFormData({ ...formData, dbaName: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem" }}>
                                            <div className="form-row" style={{ flex: 2 }}>
                                                <label>Industry Type</label>
                                                <select
                                                    value={formData.industryType}
                                                    onChange={(e) => setFormData({ ...formData, industryType: e.target.value })}
                                                >
                                                    <option value="">-- Select Industry --</option>
                                                    {(settings?.industryTypes ?? []).map((it) => (
                                                        <option key={it.type} value={it.type}>{it.sic} — {it.type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>State of the Business</label>
                                                <select
                                                    value={formData.stateOfTheBusiness}
                                                    onChange={(e) => setFormData({ ...formData, stateOfTheBusiness: e.target.value })}
                                                >
                                                    <option value="">-- Select State --</option>
                                                    {(settings?.usStates ?? []).map((s) => (
                                                        <option key={s.acronym} value={s.acronym}>{s.fullname}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>Time in Business (yrs)</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    placeholder="e.g. 1.5"
                                                    value={formData.timeInBusiness || ""}
                                                    onChange={(e) => setFormData({ ...formData, timeInBusiness: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "owner" && (
                                    <div>
                                        <button className="btn btn-sm" onClick={addOwner}>Add Owner</button>
                                        <table className="dialog-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Phone</th>
                                                    <th>Email</th>
                                                    <th>Ethnicity</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.owners.map((owner, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={owner.ownerName}
                                                                onChange={(e) => updateOwner(index, "ownerName", e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={owner.ownerPhone}
                                                                onChange={(e) => updateOwner(index, "ownerPhone", formatPhone(e.target.value))}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="email"
                                                                value={owner.ownerEmail}
                                                                onChange={(e) => updateOwner(index, "ownerEmail", e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={owner.ethnicity}
                                                                onChange={(e) => updateOwner(index, "ethnicity", e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="action-cell">
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => removeOwner(index)}
                                                                disabled={formData.owners.length === 1}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === "business-address" && (
                                    <div>
                                        <div className="form-row">
                                            <label>Street Name</label>
                                            <AddressSearch
                                                value={formData.businessAddress.streetName}
                                                onChange={(street) => setFormData({ ...formData, businessAddress: { ...formData.businessAddress, streetName: street } })}
                                                onSelect={(street, city, state, zip) => setFormData({ ...formData, businessAddress: { streetName: street, city, state, zip } })}
                                            />
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem" }}>
                                            <div className="form-row" style={{ flex: 2 }}>
                                                <label>City</label>
                                                <input
                                                    type="text"
                                                    value={formData.businessAddress.city}
                                                    onChange={(e) => setFormData({ ...formData, businessAddress: { ...formData.businessAddress, city: e.target.value } })}
                                                />
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>State</label>
                                                <select
                                                    value={formData.businessAddress.state}
                                                    onChange={(e) => setFormData({ ...formData, businessAddress: { ...formData.businessAddress, state: e.target.value } })}
                                                >
                                                    <option value="">-- Select State --</option>
                                                    {(settings?.usStates ?? []).map((s) => (
                                                        <option key={s.acronym} value={s.acronym}>{s.acronym} - {s.fullname}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>Zip</label>
                                                <input
                                                    type="text"
                                                    value={formData.businessAddress.zip}
                                                    onChange={(e) => setFormData({ ...formData, businessAddress: { ...formData.businessAddress, zip: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "home-address" && (
                                    <div>
                                        <div className="form-row">
                                            <label>Street Name</label>
                                            <AddressSearch
                                                value={formData.homeAddress.streetName}
                                                onChange={(street) => setFormData({ ...formData, homeAddress: { ...formData.homeAddress, streetName: street } })}
                                                onSelect={(street, city, state, zip) => setFormData({ ...formData, homeAddress: { streetName: street, city, state, zip } })}
                                            />
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem" }}>
                                            <div className="form-row" style={{ flex: 2 }}>
                                                <label>City</label>
                                                <input
                                                    type="text"
                                                    value={formData.homeAddress.city}
                                                    onChange={(e) => setFormData({ ...formData, homeAddress: { ...formData.homeAddress, city: e.target.value } })}
                                                />
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>State</label>
                                                <select
                                                    value={formData.homeAddress.state}
                                                    onChange={(e) => setFormData({ ...formData, homeAddress: { ...formData.homeAddress, state: e.target.value } })}
                                                >
                                                    <option value="">-- Select State --</option>
                                                    {(settings?.usStates ?? []).map((s) => (
                                                        <option key={s.acronym} value={s.acronym}>{s.acronym} - {s.fullname}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row" style={{ flex: 1 }}>
                                                <label>Zip</label>
                                                <input
                                                    type="text"
                                                    value={formData.homeAddress.zip}
                                                    onChange={(e) => setFormData({ ...formData, homeAddress: { ...formData.homeAddress, zip: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {showForm && (
                    <div className="dialog-footer">
                        <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        <button className="btn" onClick={cancelForm}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
}
