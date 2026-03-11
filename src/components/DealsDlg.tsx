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
    typeOfDeal: string;
    position: string;
    fundedDate: string;
    defaultDate: string;
    defaultDays: string;
    renewalDate: string;
    fundedAmount: string;
    netFundedAmount: string;
    originationFee: string;
    originationFeePercent: string;
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
    typeOfDeal: "new",
    position: "",
    fundedDate: "",
    defaultDate: "",
    defaultDays: "",
    renewalDate: "",
    fundedAmount: "",
    netFundedAmount: "",
    originationFee: "",
    originationFeePercent: "",
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
            typeOfDeal: deal.typeOfDeal ?? "new",
            position: deal.position ?? "",
            fundedDate: toDateInput(deal.fundedDate),
            defaultDate: toDateInput(deal.defaultDate),
            defaultDays: deal.defaultDays?.toString() ?? "",
            renewalDate: toDateInput(deal.renewalDate),
            fundedAmount: deal.fundedAmount?.toFixed(2) ?? "",
            netFundedAmount: deal.netFundedAmount?.toString() ?? "",
            originationFee: deal.originationFee?.toFixed(2) ?? "",
            originationFeePercent: deal.originationFeePercent?.toFixed(2) ?? "",
            loanTerm: deal.loanTerm?.toString() ?? "",
            weeklyOrDailyPayment: deal.weeklyOrDailyPayment ? "true" : "false",
            paymentAmount: deal.paymentAmount?.toString() ?? "",
            buyRate: deal.buyRate?.toString() ?? "",
            brokerFee: deal.brokerFee?.toString() ?? "",
            factorRate: deal.buyRate != null && deal.brokerFee != null
                ? (deal.buyRate + deal.brokerFee / 100).toFixed(4)
                : deal.factorRate?.toString() ?? "",
            mcaHistory: deal.mcaHistory ?? "",
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
            typeOfDeal: formData.typeOfDeal,
            position: formData.position,
            fundedDate: formData.fundedDate || null,
            defaultDate: formData.defaultDate || null,
            defaultDays: formData.defaultDays ? parseInt(formData.defaultDays) : null,
            renewalDate: formData.renewalDate || null,
            fundedAmount: formData.fundedAmount ? parseFloat(formData.fundedAmount) : null,
            netFundedAmount: formData.netFundedAmount ? parseFloat(formData.netFundedAmount) : null,
            originationFee: formData.originationFee ? parseFloat(formData.originationFee) : null,
            originationFeePercent: formData.originationFeePercent ? parseFloat(formData.originationFeePercent) : null,
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

    const field = (label: string, key: keyof DealFormData, type = "text", prefix?: string) => (
        <div className="form-row">
            <label>{label}</label>
            {prefix ? (
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">{prefix}</span>
                    <input
                        type={type}
                        step={type === "number" ? "0.01" : undefined}
                        placeholder={type === "number" ? "0.00" : undefined}
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    />
                </div>
            ) : (
                <input
                    type={type}
                    step={type === "number" ? "0.01" : undefined}
                    placeholder={type === "number" ? "0.00" : undefined}
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                />
            )}
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

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 1rem" }}>
                                {/* Row 1: Broker | Type of Deal | Position | MCA History */}
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
                                <div className="form-row">
                                    <label>MCA History</label>
                                    <select
                                        value={formData.mcaHistory}
                                        onChange={(e) => setFormData({ ...formData, mcaHistory: e.target.value })}
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                {/* Row 2: Funded Date | Funded Amount | Origination Fee | Net Funded Amount */}
                                {field("Funded Date", "fundedDate", "date")}
                                <div className="form-row">
                                    <label>Funded Amount</label>
                                    <div className="input-prefixed">
                                        <span className="input-prefix-symbol">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.fundedAmount}
                                            onChange={(e) => {
                                                const funded = e.target.value;
                                                const fundedNum = parseFloat(funded);
                                                const feeNum = parseFloat(formData.originationFee);
                                                const net = funded !== "" && formData.originationFee !== ""
                                                    ? (fundedNum - feeNum).toFixed(2)
                                                    : funded !== "" ? parseFloat(funded).toFixed(2) : "";
                                                const pct = funded !== "" && formData.originationFee !== "" && fundedNum !== 0
                                                    ? ((feeNum / fundedNum) * 100).toFixed(2)
                                                    : formData.originationFeePercent;
                                                setFormData({ ...formData, fundedAmount: funded, netFundedAmount: net, originationFeePercent: pct });
                                            }}
                                            onBlur={(e) => {
                                                const v = parseFloat(e.target.value);
                                                if (!isNaN(v)) setFormData((f) => ({ ...f, fundedAmount: v.toFixed(2) }));
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <label>Origination Fee</label>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <div className="input-prefixed" style={{ flex: 1 }}>
                                            <span className="input-prefix-symbol">%</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={formData.originationFeePercent}
                                                onChange={(e) => {
                                                    const pct = e.target.value;
                                                    const pctNum = parseFloat(pct);
                                                    const fundedNum = parseFloat(formData.fundedAmount);
                                                    const fee = pct !== "" && formData.fundedAmount !== ""
                                                        ? ((pctNum / 100) * fundedNum).toFixed(2)
                                                        : formData.originationFee;
                                                    const net = fee !== "" && formData.fundedAmount !== ""
                                                        ? (fundedNum - parseFloat(fee)).toFixed(2)
                                                        : formData.netFundedAmount;
                                                    setFormData({ ...formData, originationFeePercent: pct, originationFee: fee, netFundedAmount: net });
                                                }}
                                            />
                                        </div>
                                        <div className="input-prefixed" style={{ flex: 1 }}>
                                            <span className="input-prefix-symbol">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={formData.originationFee}
                                                onChange={(e) => {
                                                    const fee = e.target.value;
                                                    const feeNum = parseFloat(fee);
                                                    const fundedNum = parseFloat(formData.fundedAmount);
                                                    const pct = fee !== "" && formData.fundedAmount !== "" && fundedNum !== 0
                                                        ? ((feeNum / fundedNum) * 100).toFixed(2)
                                                        : formData.originationFeePercent;
                                                    const net = fee !== "" && formData.fundedAmount !== ""
                                                        ? (fundedNum - feeNum).toFixed(2)
                                                        : formData.fundedAmount !== "" ? parseFloat(formData.fundedAmount).toFixed(2) : "";
                                                    setFormData({ ...formData, originationFee: fee, originationFeePercent: pct, netFundedAmount: net });
                                                }}
                                                onBlur={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    if (!isNaN(v)) setFormData((f) => ({ ...f, originationFee: v.toFixed(2) }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <label>Net Funded Amount</label>
                                    <div className="input-prefixed">
                                        <span className="input-prefix-symbol">$</span>
                                        <input type="number" step="0.01" value={formData.netFundedAmount} disabled />
                                    </div>
                                </div>

                                {/* Row 3: Default Date/Days | Buy Rate | Broker Fee | Factor Rate */}
                                <div className="form-row">
                                    <label>Default Date / Days</label>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <input
                                            type="date"
                                            style={{ flex: 2 }}
                                            value={formData.defaultDate}
                                            onChange={(e) => {
                                                const dateVal = e.target.value;
                                                let days = "";
                                                if (dateVal) {
                                                    const diff = Date.now() - new Date(dateVal).getTime();
                                                    days = Math.floor(diff / 86400000).toString();
                                                }
                                                setFormData({ ...formData, defaultDate: dateVal, defaultDays: days });
                                            }}
                                        />
                                        <input
                                            type="number"
                                            style={{ flex: 1, minWidth: 0 }}
                                            placeholder="Days"
                                            value={formData.defaultDays}
                                            onChange={(e) => {
                                                const daysVal = e.target.value;
                                                let dateStr = "";
                                                if (daysVal !== "") {
                                                    const d = new Date(Date.now() - parseInt(daysVal) * 86400000);
                                                    dateStr = d.toISOString().split("T")[0];
                                                }
                                                setFormData({ ...formData, defaultDays: daysVal, defaultDate: dateStr });
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <label>Buy Rate</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.buyRate}
                                        onChange={(e) => {
                                            const buy = e.target.value;
                                            const buyNum = parseFloat(buy);
                                            const feeNum = parseFloat(formData.brokerFee);
                                            const factor = buy !== "" && formData.brokerFee !== ""
                                                ? (buyNum + feeNum / 100).toFixed(4)
                                                : buy !== "" ? buy : "";
                                            setFormData({ ...formData, buyRate: buy, factorRate: factor });
                                        }}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Broker Fee</label>
                                    <div className="input-prefixed">
                                        <span className="input-prefix-symbol">%</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.brokerFee}
                                            onChange={(e) => {
                                                const fee = e.target.value;
                                                const feeNum = parseFloat(fee);
                                                const buyNum = parseFloat(formData.buyRate);
                                                const factor = fee !== "" && formData.buyRate !== ""
                                                    ? (buyNum + feeNum / 100).toFixed(4)
                                                    : formData.buyRate !== "" ? formData.buyRate : "";
                                                setFormData({ ...formData, brokerFee: fee, factorRate: factor });
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <label>Factor Rate</label>
                                    <input type="number" step="0.0001" value={formData.factorRate} disabled />
                                </div>

                                {/* Row 4: Renewal Date | Loan Term | Payment Amount | Payment Frequency */}
                                {field("Renewal Date", "renewalDate", "date")}
                                {field("Loan Term (days)", "loanTerm", "number")}
                                {field("Payment Amount", "paymentAmount", "number", "$")}
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
