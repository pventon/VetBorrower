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
import type { OfficeRecord } from "../types/officeRecord";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

interface MapboxFeature {
  address?: string;
  text: string;
  context: MapboxContext[];
}

function AddressSearch({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (text: string) => {
    onChange(text);
    clearTimeout(debounceRef.current);
    if (text.length < 5) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json`
          + `?access_token=${MAPBOX_TOKEN}&country=US&types=address&limit=6`;
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.features ?? []);
      } catch { setSuggestions([]); }
    }, 350);
  };

  const handleSelect = (feature: MapboxFeature) => {
    const ctx = feature.context ?? [];
    const street = [feature.address, feature.text].filter(Boolean).join(" ");
    const city = ctx.find(c => c.id.startsWith("place"))?.text ?? "";
    const regionCode = ctx.find(c => c.id.startsWith("region"))?.short_code ?? "";
    const state = regionCode.replace(/^US-/, "");
    const zip = ctx.find(c => c.id.startsWith("postcode"))?.text ?? "";
    const parts = [street, city, state, zip].filter(Boolean);
    onChange(parts.join(", "));
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 1 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing an address..."
        style={{ width: "100%" }}
      />
      {suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
          background: "#fff", border: "1px solid #ccc", borderRadius: 4,
          margin: 0, padding: 0, listStyle: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
        }}>
          {suggestions.map((f, i) => {
            const ctx = f.context ?? [];
            const street = [f.address, f.text].filter(Boolean).join(" ");
            const city = ctx.find(c => c.id.startsWith("place"))?.text ?? "";
            const regionCode = ctx.find(c => c.id.startsWith("region"))?.short_code ?? "";
            const state = regionCode.replace(/^US-/, "");
            const zip = ctx.find(c => c.id.startsWith("postcode"))?.text ?? "";
            const label = [street, city, state, zip].filter(Boolean).join(", ");
            return (
              <li key={i}
                onMouseDown={() => handleSelect(f)}
                style={{ padding: "6px 10px", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f0f0")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >{label}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const US_TIMEZONES = [
    { label: "Eastern Time (ET) — New York, Miami, Atlanta",        value: "America/New_York" },
    { label: "Eastern Time — Indiana (Indianapolis)",               value: "America/Indiana/Indianapolis" },
    { label: "Eastern Time — Indiana (Knox)",                       value: "America/Indiana/Knox" },
    { label: "Eastern Time — Kentucky (Louisville)",                value: "America/Kentucky/Louisville" },
    { label: "Central Time (CT) — Chicago, Dallas, Houston",        value: "America/Chicago" },
    { label: "Central Time — North Dakota (Center)",                value: "America/North_Dakota/Center" },
    { label: "Mountain Time (MT) — Denver, Salt Lake City",         value: "America/Denver" },
    { label: "Mountain Time — Arizona (no DST)",                    value: "America/Phoenix" },
    { label: "Mountain Time — Boise",                               value: "America/Boise" },
    { label: "Pacific Time (PT) — Los Angeles, Seattle, Las Vegas", value: "America/Los_Angeles" },
    { label: "Alaska Time (AKT) — Anchorage",                       value: "America/Anchorage" },
    { label: "Alaska Time — Sitka",                                  value: "America/Sitka" },
    { label: "Alaska Time — Nome",                                   value: "America/Nome" },
    { label: "Hawaii-Aleutian Time (with DST) — Adak",              value: "America/Adak" },
    { label: "Hawaii Time (no DST) — Honolulu",                     value: "Pacific/Honolulu" },
    { label: "Atlantic Time — Puerto Rico, US Virgin Islands",      value: "America/Puerto_Rico" },
    { label: "Chamorro Time — Guam, Northern Mariana Islands",      value: "Pacific/Guam" },
    { label: "Samoa Time — American Samoa",                         value: "Pacific/Pago_Pago" },
];

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface OfficeDlgProps {
    onClose: () => void;
}

interface OfficeFormData {
    officeName: string;
    officeAcronym: string;
    address: string;
    email: string;
    phone: string;
    officeTimezone: string;
}

const emptyForm: OfficeFormData = {
    officeName: "",
    officeAcronym: "",
    address: "",
    email: "",
    phone: "",
    officeTimezone: "",
};

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function OfficeDlg({ onClose }: OfficeDlgProps) {
    const { token } = useAuth();
    const [offices, setOffices] = useState<OfficeRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingOffice, setEditingOffice] = useState<OfficeRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<OfficeFormData>(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const fetchOffices = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/office`, { headers });
            if (!res.ok) throw new Error("Failed to fetch offices");
            setOffices(await res.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load offices");
        }
    };

    useEffect(() => {
        fetchOffices();
    }, []);

    const startAdd = () => {
        setEditingOffice(null);
        setFormData(emptyForm);
        setFormError(null);
        setIsAdding(true);
    };

    const startEdit = (office: OfficeRecord) => {
        setIsAdding(false);
        setEditingOffice(office);
        setFormData({
            officeName: office.officeName,
            officeAcronym: office.officeAcronym,
            address: office.address,
            email: office.email,
            phone: office.phone,
            officeTimezone: office.officeTimezone,
        });
        setFormError(null);
    };

    const cancelForm = () => {
        setEditingOffice(null);
        setIsAdding(false);
        setFormError(null);
    };

    const handleSave = async () => {
        setFormError(null);

        if (!formData.officeName || !formData.officeAcronym) {
            setFormError("Office name and acronym are required.");
            return;
        }

        try {
            if (isAdding) {
                const res = await fetch(`${API_BASE}/api/office`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(formData),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to add office");
                }
            } else if (editingOffice) {
                const res = await fetch(`${API_BASE}/api/office/${editingOffice._id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(formData),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to update office");
                }
            }

            cancelForm();
            await fetchOffices();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const handleDelete = async (office: OfficeRecord) => {
        if (!confirm(`Delete office ${office.officeName}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/office/${office._id}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error("Failed to delete office");
            cancelForm();
            await fetchOffices();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const showForm = isAdding || editingOffice !== null;

    return (
        <div className="dialog-overlay">
            <div className="dialog dialog-extra-wide">
                <div className="dialog-header">
                    <h2>Offices</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}

                <div className="dialog-body">
                    <div className="dialog-toolbar">
                        <button className="btn" onClick={startAdd} disabled={showForm}>Add Office</button>
                    </div>

                    <table className="dialog-table">
                        <thead>
                            <tr>
                                <th>Acronym</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Timezone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offices.map((office) => (
                                <tr key={office._id} className={editingOffice?._id === office._id ? "selected-row" : ""}>
                                    <td>{office.officeAcronym}</td>
                                    <td>{office.officeName}</td>
                                    <td>{office.email}</td>
                                    <td>{office.phone}</td>
                                    <td>{office.officeTimezone}</td>
                                    <td className="action-cell">
                                        <button className="btn btn-sm" onClick={() => startEdit(office)} disabled={showForm}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(office)} disabled={showForm}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {offices.length === 0 && (
                                <tr><td colSpan={6} className="empty-row">No offices found</td></tr>
                            )}
                        </tbody>
                    </table>

                    {showForm && (
                        <div className="dialog-form">
                            <h3>{isAdding ? "Add Office" : "Edit Office"}</h3>
                            {formError && <div className="dialog-error">{formError}</div>}

                            <div className="form-row">
                                <label>Office Name</label>
                                <input
                                    type="text"
                                    value={formData.officeName}
                                    onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <label>Acronym</label>
                                <input
                                    type="text"
                                    value={formData.officeAcronym}
                                    onChange={(e) => setFormData({ ...formData, officeAcronym: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <label>Address</label>
                                <AddressSearch
                                    value={formData.address}
                                    onChange={(val) => setFormData({ ...formData, address: val })}
                                />
                            </div>
                            <div className="form-row">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                                />
                            </div>
                            <div className="form-row">
                                <label>Timezone</label>
                                <select
                                    value={formData.officeTimezone}
                                    onChange={(e) => setFormData({ ...formData, officeTimezone: e.target.value })}
                                >
                                    <option value="">-- Select Timezone --</option>
                                    {US_TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                    ))}
                                </select>
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
