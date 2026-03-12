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

interface AddressFormData {
    streetName: string;
    city: string;
    state: string;
    zip: string;
}

interface OwnerFormData {
    ownerFirstName: string;
    ownerLastName: string;
    ownerPhone: string;
    ownerEmail: string;
    ethnicity: string;
    gender: string;
    dob: string;
    age: string;
    ssn: string;
    ficoScore: string;
    driversLicenseNumber: string;
    homeAddress: AddressFormData;
}

interface CorpFormData {
    businessName: string;
    dbaName: string;
    percentOfOwnership: number;
    timeInBusiness: number;
    businessStartDate: string;
    lengthOfOwnership: number;
    stateOfTheBusiness: string;
    industryType: string;
    businessAddress: AddressFormData;
    owners: OwnerFormData[];
}

type TabName = "general" | "owner" | "business-address";

const emptyAddress: AddressFormData = { streetName: "", city: "", state: "", zip: "" };
const emptyOwner: OwnerFormData = {
    ownerFirstName: "", ownerLastName: "", ownerPhone: "", ownerEmail: "",
    ethnicity: "", gender: "", dob: "", age: "",
    ssn: "", ficoScore: "", driversLicenseNumber: "",
    homeAddress: { ...emptyAddress },
};
const emptyForm: CorpFormData = {
    businessName: "", dbaName: "", percentOfOwnership: 0,
    timeInBusiness: 0, businessStartDate: "", lengthOfOwnership: 0,
    stateOfTheBusiness: "", industryType: "",
    businessAddress: { ...emptyAddress },
    owners: [{ ...emptyOwner }],
};

function toDateInput(value: string | undefined): string {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatSSN(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

const tabs: { key: TabName; label: string }[] = [
    { key: "general", label: "General" },
    { key: "owner", label: "Owner" },
    { key: "business-address", label: "Business Address" },
];

export default function CorporationsDlg({ onClose }: CorporationsDlgProps) {
    const { token } = useAuth();
    const { settings } = useSettings();
    const [corporations, setCorporations] = useState<CorporationRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingCorp, setEditingCorp] = useState<CorporationRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<CorpFormData>({ ...emptyForm, businessAddress: { ...emptyAddress } });
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
        setFormData({ ...emptyForm, businessAddress: { ...emptyAddress }, owners: [{ ...emptyOwner }] });
        setFormError(null);
        setActiveTab("general");
        setIsAdding(true);
    };

    const startEdit = (corp: CorporationRecord) => {
        setIsAdding(false);
        setEditingCorp(corp);
        const owners = (corp.ownerDetails ?? []).map(o => ({
            ownerFirstName: o.ownerFirstName ?? "",
            ownerLastName: o.ownerLastName ?? "",
            ownerPhone: o.ownerPhone?.[0] ?? "",
            ownerEmail: o.ownerEmail?.[0] ?? "",
            ethnicity: o.ethnicity ?? "",
            gender: o.gender ?? "",
            dob: toDateInput(o.dob),
            age: o.age ? String(o.age) : "",
            ssn: o.ssn ?? "",
            ficoScore: o.ficoScore ? String(o.ficoScore) : "",
            driversLicenseNumber: o.driversLicenseNumber ?? "",
            homeAddress: o.homeAddress ? { ...o.homeAddress } : { ...emptyAddress },
        }));
        setFormData({
            businessName: corp.businessName ?? "",
            dbaName: corp.dbaName ?? "",
            percentOfOwnership: corp.percentOfOwnership ?? 0,
            timeInBusiness: corp.timeInBusiness ?? 0,
            businessStartDate: toDateInput(corp.businessStartDate),
            lengthOfOwnership: corp.lengthOfOwnership ?? 0,
            stateOfTheBusiness: corp.stateOfTheBusiness ?? "",
            industryType: corp.industryType ?? "",
            businessAddress: corp.businessAddress
                ? { ...corp.businessAddress }
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
                ownerFirstName: o.ownerFirstName,
                ownerLastName: o.ownerLastName,
                ownerPhone: o.ownerPhone ? [o.ownerPhone] : [],
                ownerEmail: o.ownerEmail ? [o.ownerEmail] : [],
                ethnicity: o.ethnicity,
                gender: o.gender || null,
                dob: o.dob || null,
                age: o.age ? parseInt(o.age) : null,
                ssn: o.ssn || null,
                ficoScore: o.ficoScore ? parseFloat(o.ficoScore) : null,
                driversLicenseNumber: o.driversLicenseNumber || null,
                homeAddress: o.homeAddress,
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
        if (!confirm(`Delete client ${corp.businessName}?`)) return;

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

    const updateOwner = (index: number, field: keyof Omit<OwnerFormData, "homeAddress">, value: string) => {
        const updated = formData.owners.map((o, i) => i === index ? { ...o, [field]: value } : o);
        setFormData({ ...formData, owners: updated });
    };

    const updateOwnerAddress = (index: number, field: keyof AddressFormData, value: string) => {
        const updated = formData.owners.map((o, i) =>
            i === index ? { ...o, homeAddress: { ...o.homeAddress, [field]: value } } : o
        );
        setFormData({ ...formData, owners: updated });
    };

    const showForm = editingCorp !== null;

    const formFields = (
        <>
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
                                <label>Business Start Date</label>
                                <input
                                    type="date"
                                    value={formData.businessStartDate}
                                    onChange={(e) => {
                                        const dateStr = e.target.value;
                                        const days = dateStr ? Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000) : 0;
                                        setFormData({ ...formData, businessStartDate: dateStr, timeInBusiness: days > 0 ? days : 0 });
                                    }}
                                />
                            </div>
                            <div className="form-row" style={{ flex: 1 }}>
                                <label>Time in Business (days)</label>
                                <input
                                    type="number"
                                    value={formData.timeInBusiness || ""}
                                    onChange={(e) => {
                                        const days = parseInt(e.target.value) || 0;
                                        const dateStr = days > 0 ? new Date(Date.now() - days * 86400000).toISOString().split("T")[0] : "";
                                        setFormData({ ...formData, timeInBusiness: days, businessStartDate: dateStr });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "owner" && (
                    <div>
                        <button className="btn btn-sm" style={{ marginBottom: "0.75rem" }} onClick={addOwner}>Add Owner</button>
                        {formData.owners.map((owner, index) => (
                            <div key={index} style={{ border: "1px solid var(--color-border, #ccc)", borderRadius: "6px", padding: "0.75rem", marginBottom: "0.75rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <strong>Owner {index + 1}</strong>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => removeOwner(index)}
                                        disabled={formData.owners.length === 1}
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 1rem" }}>
                                    {/* Row 1: First Name | Last Name | Phone | Email */}
                                    <div className="form-row">
                                        <label>First Name</label>
                                        <input type="text" value={owner.ownerFirstName} onChange={(e) => updateOwner(index, "ownerFirstName", e.target.value)} />
                                    </div>
                                    <div className="form-row">
                                        <label>Last Name</label>
                                        <input type="text" value={owner.ownerLastName} onChange={(e) => updateOwner(index, "ownerLastName", e.target.value)} />
                                    </div>
                                    <div className="form-row">
                                        <label>Phone</label>
                                        <input type="text" value={owner.ownerPhone} onChange={(e) => updateOwner(index, "ownerPhone", formatPhone(e.target.value))} />
                                    </div>
                                    <div className="form-row">
                                        <label>Email</label>
                                        <input type="email" value={owner.ownerEmail} onChange={(e) => updateOwner(index, "ownerEmail", e.target.value)} />
                                    </div>

                                    {/* Row 2: Home Street | City | State | Zip */}
                                    <div className="form-row">
                                        <label>Home Street</label>
                                        <AddressSearch
                                            value={owner.homeAddress.streetName}
                                            onChange={(street) => updateOwnerAddress(index, "streetName", street)}
                                            onSelect={(street, city, state, zip) => {
                                                const updated = formData.owners.map((o, i) =>
                                                    i === index ? { ...o, homeAddress: { streetName: street, city, state, zip } } : o
                                                );
                                                setFormData({ ...formData, owners: updated });
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <div className="form-row" style={{ flex: 2 }}>
                                            <label>City</label>
                                            <input type="text" value={owner.homeAddress.city} onChange={(e) => updateOwnerAddress(index, "city", e.target.value)} />
                                        </div>
                                        <div className="form-row" style={{ flex: 1 }}>
                                            <label>State</label>
                                            <select value={owner.homeAddress.state} onChange={(e) => updateOwnerAddress(index, "state", e.target.value)}>
                                                <option value="">--</option>
                                                {(settings?.usStates ?? []).map((s) => (
                                                    <option key={s.acronym} value={s.acronym}>{s.acronym}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <label>Zip</label>
                                        <input type="text" value={owner.homeAddress.zip} onChange={(e) => updateOwnerAddress(index, "zip", e.target.value)} />
                                    </div>
                                    <div className="form-row">
                                        <label>Ethnicity</label>
                                        <select value={owner.ethnicity} onChange={(e) => updateOwner(index, "ethnicity", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            <option value="Hispanic or Latino">Hispanic or Latino</option>
                                            <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                                            <option value="Asian">Asian</option>
                                            <option value="Black or African American">Black or African American</option>
                                            <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                                            <option value="White">White</option>
                                            <option value="Not Provided / Declined to State">Not Provided / Declined to State</option>
                                        </select>
                                    </div>

                                    {/* Row 3: DOB | Age+Gender | SSN+FICO | DL # */}
                                    <div className="form-row">
                                        <label>Date of Birth</label>
                                        <input
                                            type="date"
                                            value={owner.dob}
                                            onChange={(e) => {
                                                const dob = e.target.value;
                                                const age = dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))) : "";
                                                const updated = formData.owners.map((o, i) => i === index ? { ...o, dob, age } : o);
                                                setFormData({ ...formData, owners: updated });
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <div className="form-row" style={{ flex: 1 }}>
                                            <label>Age</label>
                                            <input
                                                type="number"
                                                value={owner.age}
                                                onChange={(e) => {
                                                    const age = e.target.value;
                                                    const today = new Date();
                                                    const dob = age ? new Date(today.getFullYear() - parseInt(age), today.getMonth(), today.getDate()).toISOString().split("T")[0] : "";
                                                    const updated = formData.owners.map((o, i) => i === index ? { ...o, age, dob } : o);
                                                    setFormData({ ...formData, owners: updated });
                                                }}
                                            />
                                        </div>
                                        <div className="form-row" style={{ flex: 1 }}>
                                            <label>Gender</label>
                                            <select value={owner.gender} onChange={(e) => updateOwner(index, "gender", e.target.value)}>
                                                <option value="">--</option>
                                                <option value="M">M</option>
                                                <option value="F">F</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <div className="form-row" style={{ flex: 2 }}>
                                            <label>SSN</label>
                                            <input type="text" value={owner.ssn} placeholder="xxx-xx-xxxx" onChange={(e) => updateOwner(index, "ssn", formatSSN(e.target.value))} />
                                        </div>
                                        <div className="form-row" style={{ flex: 1 }}>
                                            <label>FICO</label>
                                            <input type="number" value={owner.ficoScore} onChange={(e) => updateOwner(index, "ficoScore", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <label>Driver's License #</label>
                                        <input type="text" value={owner.driversLicenseNumber} onChange={(e) => updateOwner(index, "driversLicenseNumber", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
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
            </div>
        </>
    );

    return (
        <>
            <div className="dialog-overlay">
                <div className="dialog dialog-extra-wide">
                    <div className="dialog-header">
                        <h2>Funded Clients</h2>
                        <button className="dialog-close" onClick={onClose}>&times;</button>
                    </div>

                    {error && <div className="dialog-error">{error}</div>}

                    <div className="dialog-body">
                        <div className="dialog-toolbar">
                            <button className="btn" onClick={startAdd} disabled={isAdding || showForm}>Add Client</button>
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
                                            <button className="btn btn-sm btn-success" onClick={() => startEdit(corp)} disabled={isAdding || showForm}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(corp)} disabled={isAdding || showForm}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {corporations.length === 0 && (
                                    <tr><td colSpan={6} className="empty-row">No corporations found</td></tr>
                                )}
                            </tbody>
                        </table>

                    </div>
                </div>
            </div>

            {showForm && (
                <div className="dialog-overlay" style={{ zIndex: 2001 }}>
                    <div className="dialog dialog-extra-wide">
                        <div className="dialog-header">
                            <h2>Edit Client</h2>
                            <button className="dialog-close" onClick={cancelForm}>&times;</button>
                        </div>
                        {formError && <div className="dialog-error">{formError}</div>}
                        <div className="dialog-body">
                            {formFields}
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
                    <div className="dialog dialog-extra-wide">
                        <div className="dialog-header">
                            <h2>Add Client</h2>
                            <button className="dialog-close" onClick={cancelForm}>&times;</button>
                        </div>
                        {formError && <div className="dialog-error">{formError}</div>}
                        <div className="dialog-body">
                            {formFields}
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
