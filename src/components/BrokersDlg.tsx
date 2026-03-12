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
import type { BrokerRecord } from "../types/brokerRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface BrokersDlgProps {
    onClose: () => void;
}

interface BrokerFormData {
    brokerName: string;
}

const emptyForm: BrokerFormData = {
    brokerName: "",
};

function formatCurrency(value: number): string {
    if (!value) return "$0";
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BrokersDlg({ onClose }: BrokersDlgProps) {
    const { token } = useAuth();
    const [brokers, setBrokers] = useState<BrokerRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingBroker, setEditingBroker] = useState<BrokerRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<BrokerFormData>(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const fetchBrokers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/broker`, { headers });
            if (!res.ok) throw new Error("Failed to fetch brokers");
            setBrokers(await res.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load brokers");
        }
    };

    useEffect(() => {
        fetchBrokers();
    }, []);

    const startAdd = () => {
        setEditingBroker(null);
        setFormData(emptyForm);
        setFormError(null);
        setIsAdding(true);
    };

    const startEdit = (broker: BrokerRecord) => {
        setIsAdding(false);
        setEditingBroker(broker);
        setFormData({ brokerName: broker.brokerName });
        setFormError(null);
    };

    const cancelForm = () => {
        setEditingBroker(null);
        setIsAdding(false);
        setFormError(null);
    };

    const handleSave = async () => {
        setFormError(null);

        if (!formData.brokerName.trim()) {
            setFormError("Broker name is required.");
            return;
        }

        try {
            if (isAdding) {
                const res = await fetch(`${API_BASE}/api/broker`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(formData),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to add broker");
                }
            } else if (editingBroker) {
                const res = await fetch(`${API_BASE}/api/broker/${editingBroker._id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(formData),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to update broker");
                }
            }

            cancelForm();
            await fetchBrokers();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const handleDelete = async (broker: BrokerRecord) => {
        if (!confirm(`Delete broker "${broker.brokerName}"?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/broker/${broker._id}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error("Failed to delete broker");
            cancelForm();
            await fetchBrokers();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const showForm = isAdding || editingBroker !== null;

    return (
        <div className="dialog-overlay">
            <div className="dialog dialog-extra-wide">
                <div className="dialog-header">
                    <h2>Brokers</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}

                <div className="dialog-body">
                    <div className="dialog-toolbar">
                        <button className="btn" onClick={startAdd} disabled={showForm}>Add Broker</button>
                    </div>

                    <table className="dialog-table">
                        <thead>
                            <tr>
                                <th>Broker Name</th>
                                <th style={{ textAlign: "center" }}>Submissions</th>
                                <th style={{ textAlign: "center" }}>Approvals</th>
                                <th style={{ textAlign: "center" }}>Declines</th>
                                <th style={{ textAlign: "center" }}>Funded Deals</th>
                                <th style={{ textAlign: "right" }}>Total Funded</th>
                                <th style={{ textAlign: "right" }}>Defaults</th>
                                <th style={{ textAlign: "center" }}>Num. Defaults</th>
                                <th style={{ textAlign: "right" }}>Commission</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brokers.map((broker) => (
                                <tr key={broker._id} className={editingBroker?._id === broker._id ? "selected-row" : ""}>
                                    <td>{broker.brokerName}</td>
                                    <td style={{ textAlign: "center" }}>{broker.numberOfSubmissions ?? 0}</td>
                                    <td style={{ textAlign: "center" }}>{broker.numberOfApprovals ?? 0}</td>
                                    <td style={{ textAlign: "center" }}>{broker.numberOfDeclines ?? 0}</td>
                                    <td style={{ textAlign: "center" }}>{broker.numberOfFundedDeals ?? 0}</td>
                                    <td style={{ textAlign: "right" }}>{formatCurrency(broker.totalDollarAmountFunded ?? 0)}</td>
                                    <td style={{ textAlign: "right" }}>{formatCurrency(broker.totalDollarAmountOfDefaults ?? 0)}</td>
                                    <td style={{ textAlign: "center" }}>{broker.totalNumberOfDefaults ?? 0}</td>
                                    <td style={{ textAlign: "right" }}>{formatCurrency(broker.totalCommissionAmount ?? 0)}</td>
                                    <td className="action-cell">
                                        <button className="btn btn-sm btn-success" onClick={() => startEdit(broker)} disabled={showForm}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(broker)} disabled={showForm}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {brokers.length === 0 && (
                                <tr><td colSpan={10} className="empty-row">No brokers found</td></tr>
                            )}
                        </tbody>
                    </table>

                    {showForm && (
                        <div className="dialog-form">
                            <h3>{isAdding ? "Add Broker" : "Edit Broker"}</h3>
                            {formError && <div className="dialog-error">{formError}</div>}

                            <div className="form-row">
                                <label>Broker Name</label>
                                <input
                                    type="text"
                                    value={formData.brokerName}
                                    onChange={(e) => setFormData({ brokerName: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            {!isAdding && editingBroker && (
                                <div style={{ marginTop: "1rem" }}>
                                    <h4 style={{ marginBottom: "0.5rem" }}>Statistics (read-only)</h4>
                                    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Submissions</label>
                                            <input type="text" readOnly value={editingBroker.numberOfSubmissions ?? 0} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Approvals</label>
                                            <input type="text" readOnly value={editingBroker.numberOfApprovals ?? 0} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Declines</label>
                                            <input type="text" readOnly value={editingBroker.numberOfDeclines ?? 0} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Funded Deals</label>
                                            <input type="text" readOnly value={editingBroker.numberOfFundedDeals ?? 0} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Total Funded</label>
                                            <input type="text" readOnly value={formatCurrency(editingBroker.totalDollarAmountFunded ?? 0)} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Defaults</label>
                                            <input type="text" readOnly value={formatCurrency(editingBroker.totalDollarAmountOfDefaults ?? 0)} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Num. Defaults</label>
                                            <input type="text" readOnly value={editingBroker.totalNumberOfDefaults ?? 0} style={{ background: "#f5f5f5" }} />
                                        </div>
                                        <div className="form-row" style={{ flex: "0 0 auto" }}>
                                            <label>Commission</label>
                                            <input type="text" readOnly value={formatCurrency(editingBroker.totalCommissionAmount ?? 0)} style={{ background: "#f5f5f5" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
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
