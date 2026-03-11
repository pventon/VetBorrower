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
import type { CorporationRecord } from "../types/corporationRecord";
import type { DealRecord } from "../types/dealRecord";
import type { BrokerRecord } from "../types/brokerRecord";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface DealsDlgProps {
    onClose: () => void;
}

interface DealFormData {
    broker: string;
    referringIso: string;
    typeOfDeal: string;
    position: string;
    fundedDate: string;
    defaultDate: string;
    renewalDate: string;
    fundedAmount: string;
    netFundedAmount: string;
    originationFee: string;
    loanTerm: string;
    weeklyOrDailyPayment: string;   // "true" = weekly, "false" = daily
    paymentAmount: string;
    buyRate: string;
    factorRate: string;
    mcaHistory: string;
    brokerFee: string;
}

const emptyForm: DealFormData = {
    broker: "",
    referringIso: "",
    typeOfDeal: "new",
    position: "",
    fundedDate: "",
    defaultDate: "",
    renewalDate: "",
    fundedAmount: "",
    netFundedAmount: "",
    originationFee: "",
    loanTerm: "",
    weeklyOrDailyPayment: "false",
    paymentAmount: "",
    buyRate: "",
    factorRate: "",
    mcaHistory: "",
    brokerFee: "",
};

function formatCurrency(value: number | undefined): string {
    if (!value) return "-";
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | undefined): string {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-US");
}

function toDateInput(value: string | undefined): string {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

export default function DealsDlg({ onClose }: DealsDlgProps) {
    const { token } = useAuth();
    const [corporations, setCorporations] = useState<CorporationRecord[]>([]);
    const [selectedCorpId, setSelectedCorpId] = useState<string>("");
    const [deals, setDeals] = useState<DealRecord[]>([]);
    const [brokers, setBrokers] = useState<BrokerRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editingDeal, setEditingDeal] = useState<DealRecord | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<DealFormData>(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    useEffect(() => {
        const fetchInit = async () => {
            try {
                const [corpRes, brokerRes] = await Promise.all([
                    fetch(`${API_BASE}/api/corporation`, { headers }),
                    fetch(`${API_BASE}/api/broker`, { headers }),
                ]);
                if (!corpRes.ok) throw new Error("Failed to fetch corporations");
                if (!brokerRes.ok) throw new Error("Failed to fetch brokers");
                setCorporations(await corpRes.json());
                setBrokers(await brokerRes.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load data");
            }
        };
        fetchInit();
    }, []);

    const fetchDeals = async (corpId: string) => {
        if (!corpId) { setDeals([]); return; }
        try {
            const res = await fetch(`${API_BASE}/api/deal?corporationId=${corpId}`, { headers });
            if (!res.ok) throw new Error("Failed to fetch deals");
            setDeals(await res.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load deals");
        }
    };

    const handleCorpChange = (corpId: string) => {
        setSelectedCorpId(corpId);
        cancelForm();
        fetchDeals(corpId);
    };

    const startAdd = () => {
        setEditingDeal(null);
        setFormData(emptyForm);
        setFormError(null);
        setIsAdding(true);
    };

    const startEdit = (deal: DealRecord) => {
        setIsAdding(false);
        setEditingDeal(deal);
        setFormData({
            broker: deal.broker?._id ?? "",
            referringIso: deal.referringIso ?? "",
            typeOfDeal: deal.typeOfDeal ?? "new",
            position: deal.position ?? "",
            fundedDate: toDateInput(deal.fundedDate),
            defaultDate: toDateInput(deal.defaultDate),
            renewalDate: toDateInput(deal.renewalDate),
            fundedAmount: deal.fundedAmount?.toString() ?? "",
            netFundedAmount: deal.netFundedAmount?.toString() ?? "",
            originationFee: deal.originationFee?.toString() ?? "",
            loanTerm: deal.loanTerm?.toString() ?? "",
            weeklyOrDailyPayment: deal.weeklyOrDailyPayment ? "true" : "false",
            paymentAmount: deal.paymentAmount?.toString() ?? "",
            buyRate: deal.buyRate?.toString() ?? "",
            factorRate: deal.factorRate?.toString() ?? "",
            mcaHistory: deal.mcaHistory ?? "",
            brokerFee: deal.brokerFee?.toString() ?? "",
        });
        setFormError(null);
    };

    const cancelForm = () => {
        setEditingDeal(null);
        setIsAdding(false);
        setFormError(null);
    };

    const handleSave = async () => {
        setFormError(null);
        if (!selectedCorpId) { setFormError("No corporation selected."); return; }

        const payload = {
            corporationId: selectedCorpId,
            broker: formData.broker || null,
            referringIso: formData.referringIso,
            typeOfDeal: formData.typeOfDeal,
            position: formData.position,
            fundedDate: formData.fundedDate || null,
            defaultDate: formData.defaultDate || null,
            renewalDate: formData.renewalDate || null,
            fundedAmount: formData.fundedAmount ? parseFloat(formData.fundedAmount) : null,
            netFundedAmount: formData.netFundedAmount ? parseFloat(formData.netFundedAmount) : null,
            originationFee: formData.originationFee ? parseFloat(formData.originationFee) : null,
            loanTerm: formData.loanTerm ? parseInt(formData.loanTerm) : null,
            weeklyOrDailyPayment: formData.weeklyOrDailyPayment === "true",
            paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
            buyRate: formData.buyRate ? parseFloat(formData.buyRate) : null,
            factorRate: formData.factorRate ? parseFloat(formData.factorRate) : null,
            mcaHistory: formData.mcaHistory,
            brokerFee: formData.brokerFee ? parseFloat(formData.brokerFee) : null,
        };

        try {
            if (isAdding) {
                const res = await fetch(`${API_BASE}/api/deal`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add deal"); }
            } else if (editingDeal) {
                const res = await fetch(`${API_BASE}/api/deal/${editingDeal._id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(payload),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update deal"); }
            }
            cancelForm();
            await fetchDeals(selectedCorpId);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const handleDelete = async (deal: DealRecord) => {
        if (!confirm(`Delete this deal?`)) return;
        try {
            const res = await fetch(`${API_BASE}/api/deal/${deal._id}?corporationId=${selectedCorpId}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) throw new Error("Failed to delete deal");
            cancelForm();
            await fetchDeals(selectedCorpId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const showForm = isAdding || editingDeal !== null;

    const field = (label: string, key: keyof DealFormData, type = "text") => (
        <div className="form-row">
            <label>{label}</label>
            <input
                type={type}
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
            />
        </div>
    );

    return (
        <div className="dialog-overlay">
            <div className="dialog dialog-extra-wide">
                <div className="dialog-header">
                    <h2>Deals</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}

                <div className="dialog-body">
                    <div className="dialog-toolbar" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <label style={{ margin: 0 }}>Corporation:</label>
                        <select
                            value={selectedCorpId}
                            onChange={(e) => handleCorpChange(e.target.value)}
                            style={{ flex: 1 }}
                            disabled={showForm}
                        >
                            <option value="">-- Select Corporation --</option>
                            {corporations.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.businessName}{c.dbaName ? ` (${c.dbaName})` : ""}
                                </option>
                            ))}
                        </select>
                        <button className="btn" onClick={startAdd} disabled={!selectedCorpId || showForm}>
                            Add Deal
                        </button>
                    </div>

                    {selectedCorpId && (
                        <table className="dialog-table" style={{ marginTop: "1rem" }}>
                            <thead>
                                <tr>
                                    <th>Broker</th>
                                    <th>Type</th>
                                    <th>Funded Date</th>
                                    <th>Funded Amount</th>
                                    <th>Net Funded</th>
                                    <th>Term (days)</th>
                                    <th>Factor Rate</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deals.map((deal) => (
                                    <tr key={deal._id} className={editingDeal?._id === deal._id ? "selected-row" : ""}>
                                        <td>{deal.broker?.brokerName ?? "-"}</td>
                                        <td>{deal.typeOfDeal ?? "-"}</td>
                                        <td>{formatDate(deal.fundedDate)}</td>
                                        <td>{formatCurrency(deal.fundedAmount)}</td>
                                        <td>{formatCurrency(deal.netFundedAmount)}</td>
                                        <td>{deal.loanTerm ?? "-"}</td>
                                        <td>{deal.factorRate ?? "-"}</td>
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-success" onClick={() => startEdit(deal)} disabled={showForm}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(deal)} disabled={showForm}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {deals.length === 0 && (
                                    <tr><td colSpan={8} className="empty-row">No deals found for this corporation</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {showForm && (
                        <div className="dialog-form">
                            <h3>{isAdding ? "Add Deal" : "Edit Deal"}</h3>
                            {formError && <div className="dialog-error">{formError}</div>}

                            <div style={{ display: "flex", gap: "1rem" }}>
                                <div style={{ flex: 1 }}>
                                    <div className="form-row">
                                        <label>Broker</label>
                                        <select
                                            value={formData.broker}
                                            onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                                        >
                                            <option value="">-- None --</option>
                                            {brokers.map((b) => (
                                                <option key={b._id} value={b._id}>{b.brokerName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {field("Referring ISO", "referringIso")}
                                    <div className="form-row">
                                        <label>Type of Deal</label>
                                        <select
                                            value={formData.typeOfDeal}
                                            onChange={(e) => setFormData({ ...formData, typeOfDeal: e.target.value })}
                                        >
                                            <option value="new">New</option>
                                            <option value="renewal">Renewal</option>
                                        </select>
                                    </div>
                                    {field("Position", "position")}
                                    {field("MCA History", "mcaHistory")}
                                </div>
                                <div style={{ flex: 1 }}>
                                    {field("Funded Date", "fundedDate", "date")}
                                    {field("Default Date", "defaultDate", "date")}
                                    {field("Renewal Date", "renewalDate", "date")}
                                </div>
                                <div style={{ flex: 1 }}>
                                    {field("Funded Amount ($)", "fundedAmount", "number")}
                                    {field("Net Funded Amount ($)", "netFundedAmount", "number")}
                                    {field("Origination Fee ($)", "originationFee", "number")}
                                    {field("Broker Fee ($)", "brokerFee", "number")}
                                </div>
                                <div style={{ flex: 1 }}>
                                    {field("Loan Term (days)", "loanTerm", "number")}
                                    {field("Payment Amount ($)", "paymentAmount", "number")}
                                    {field("Buy Rate", "buyRate", "number")}
                                    {field("Factor Rate", "factorRate", "number")}
                                    <div className="form-row">
                                        <label>Payment Frequency</label>
                                        <select
                                            value={formData.weeklyOrDailyPayment}
                                            onChange={(e) => setFormData({ ...formData, weeklyOrDailyPayment: e.target.value })}
                                        >
                                            <option value="false">Daily</option>
                                            <option value="true">Weekly</option>
                                        </select>
                                    </div>
                                </div>
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
