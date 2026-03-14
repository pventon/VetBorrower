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
    brokerCommission: string;
    totalPaybackAmount: string;
    hasDefaulted: boolean;
    amountOwedAsOfDefault: string;
    miscellaneousFees: string;
    miscellaneousExpenses: string;
    discount: string;
    amountPaidIn: string;
    totalCashOut: string;
    totalPaybackWithFeesAndExpenses: string;
    netProfit: string;
    rolledBalance: string;
    netNewCashOut: string;
    roi: string;
    currentRoi: string;
}

const emptyForm: DealFormData = {
    broker: "",
    typeOfDeal: "new",
    position: "",
    fundedDate: "",
    defaultDate: "",
    defaultDays: "",
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
    brokerCommission: "",
    totalPaybackAmount: "",
    hasDefaulted: false,
    amountOwedAsOfDefault: "",
    miscellaneousFees: "",
    miscellaneousExpenses: "",
    discount: "",
    amountPaidIn: "",
    totalCashOut: "",
    totalPaybackWithFeesAndExpenses: "",
    netProfit: "",
    rolledBalance: "",
    netNewCashOut: "",
    roi: "",
    currentRoi: "",
};

function formatCurrency(value: number | undefined): string {
    if (!value) return "-";
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDollar(value: string): string {
    if (!value) return "";
    const num = parseFloat(value.replace(/,/g, ""));
    if (isNaN(num)) return value;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stripCommas(value: string): string {
    return value.replace(/,/g, "");
}

function formatDate(value: string | undefined): string {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-US");
}

function parseDateUTC(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
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
    const [renewingParentId, setRenewingParentId] = useState<string | null>(null);
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
        setFormData({ ...emptyForm, fundedDate: new Date().toISOString().split("T")[0] });
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
            fundedAmount: deal.fundedAmount != null ? formatDollar(deal.fundedAmount.toFixed(2)) : "",
            netFundedAmount: deal.netFundedAmount?.toString() ?? "",
            originationFee: deal.originationFee != null ? formatDollar(deal.originationFee.toFixed(2)) : "",
            originationFeePercent: deal.originationFeePercent?.toFixed(2) ?? "",
            loanTerm: deal.loanTerm?.toString() ?? "",
            weeklyOrDailyPayment: deal.weeklyOrDailyPayment ? "true" : "false",
            paymentAmount: (() => {
                const total = deal.fundedAmount != null && deal.factorRate != null ? deal.fundedAmount * deal.factorRate : deal.totalPaybackAmount ?? 0;
                const term = deal.loanTerm ?? 0;
                if (total > 0 && term > 0)
                    return deal.weeklyOrDailyPayment ? (total / (term / 5)).toFixed(2) : (total / term).toFixed(2);
                return deal.paymentAmount?.toFixed(2) ?? "";
            })(),
            buyRate: deal.buyRate?.toString() ?? "",
            brokerFee: deal.brokerFee?.toString() ?? "",
            factorRate: deal.buyRate != null && deal.brokerFee != null
                ? (deal.buyRate + deal.brokerFee / 100).toFixed(2)
                : deal.factorRate?.toString() ?? "",
            mcaHistory: deal.mcaHistory ?? "",
            brokerCommission: deal.brokerFee != null && deal.fundedAmount != null
                ? ((deal.brokerFee / 100) * deal.fundedAmount).toFixed(2)
                : deal.brokerCommission?.toFixed(2) ?? "",
            totalPaybackAmount: deal.fundedAmount != null && deal.factorRate != null
                ? (deal.fundedAmount * deal.factorRate).toFixed(2)
                : deal.totalPaybackAmount?.toFixed(2) ?? "",
            hasDefaulted: deal.hasDefaulted ?? false,
            amountOwedAsOfDefault: deal.amountOwedAsOfDefault?.toFixed(2) ?? "",
            miscellaneousFees: deal.miscellaneousFees != null ? formatDollar(deal.miscellaneousFees.toFixed(2)) : "",
            miscellaneousExpenses: deal.miscellaneousExpenses != null ? formatDollar(deal.miscellaneousExpenses.toFixed(2)) : "",
            discount: deal.discount != null ? formatDollar(deal.discount.toFixed(2)) : "",
            amountPaidIn: deal.amountPaidIn != null ? formatDollar(deal.amountPaidIn.toFixed(2)) : "",
            totalCashOut: deal.totalCashOut != null ? formatDollar(deal.totalCashOut.toFixed(2)) : "",
            totalPaybackWithFeesAndExpenses: deal.totalPaybackWithFeesAndExpenses != null ? formatDollar(deal.totalPaybackWithFeesAndExpenses.toFixed(2)) : "",
            netProfit: deal.netProfit != null ? formatDollar(deal.netProfit.toFixed(2)) : "",
            rolledBalance: deal.rolledBalance != null ? formatDollar(deal.rolledBalance.toFixed(2)) : "",
            netNewCashOut: deal.netNewCashOut != null ? formatDollar(deal.netNewCashOut.toFixed(2)) : "",
            roi: deal.roi?.toFixed(2) ?? "",
            currentRoi: deal.currentRoi?.toFixed(2) ?? "",
        });
        setFormError(null);
    };

    const cancelForm = () => {
        setEditingDeal(null);
        setIsAdding(false);
        setRenewingParentId(null);
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
            fundedAmount: formData.fundedAmount ? parseFloat(stripCommas(formData.fundedAmount)) : null,
            netFundedAmount: formData.netFundedAmount ? parseFloat(stripCommas(formData.netFundedAmount)) : null,
            originationFee: formData.originationFee ? parseFloat(stripCommas(formData.originationFee)) : null,
            originationFeePercent: formData.originationFeePercent ? parseFloat(formData.originationFeePercent) : null,
            loanTerm: formData.loanTerm ? parseInt(formData.loanTerm) : null,
            weeklyOrDailyPayment: formData.weeklyOrDailyPayment === "true",
            paymentAmount: formData.paymentAmount ? parseFloat(stripCommas(formData.paymentAmount)) : null,
            buyRate: formData.buyRate ? parseFloat(formData.buyRate) : null,
            factorRate: formData.factorRate ? parseFloat(formData.factorRate) : null,
            mcaHistory: formData.mcaHistory,
            brokerFee: formData.brokerFee ? parseFloat(formData.brokerFee) : null,
            brokerCommission: formData.brokerCommission ? parseFloat(stripCommas(formData.brokerCommission)) : null,
            totalPaybackAmount: formData.totalPaybackAmount ? parseFloat(stripCommas(formData.totalPaybackAmount)) : null,
            hasDefaulted: formData.hasDefaulted,
            amountOwedAsOfDefault: formData.amountOwedAsOfDefault ? parseFloat(stripCommas(formData.amountOwedAsOfDefault)) : null,
            miscellaneousFees: formData.miscellaneousFees ? parseFloat(stripCommas(formData.miscellaneousFees)) : null,
            miscellaneousExpenses: formData.miscellaneousExpenses ? parseFloat(stripCommas(formData.miscellaneousExpenses)) : null,
            discount: formData.discount ? parseFloat(stripCommas(formData.discount)) : null,
            amountPaidIn: formData.amountPaidIn ? parseFloat(stripCommas(formData.amountPaidIn)) : null,
            totalCashOut: formData.totalCashOut ? parseFloat(stripCommas(formData.totalCashOut)) : null,
            totalPaybackWithFeesAndExpenses: formData.totalPaybackWithFeesAndExpenses ? parseFloat(stripCommas(formData.totalPaybackWithFeesAndExpenses)) : null,
            netProfit: formData.netProfit ? parseFloat(stripCommas(formData.netProfit)) : null,
            rolledBalance: formData.rolledBalance ? parseFloat(stripCommas(formData.rolledBalance)) : null,
            netNewCashOut: formData.netNewCashOut ? parseFloat(stripCommas(formData.netNewCashOut)) : null,
            roi: formData.roi ? parseFloat(formData.roi) : null,
            currentRoi: formData.currentRoi ? parseFloat(formData.currentRoi) : null,
        };

        try {
            if (isAdding) {
                // If this is a renewal, include the parent link
                if (renewingParentId) {
                    (payload as Record<string, unknown>).parentDealId = renewingParentId;
                }
                const res = await fetch(`${API_BASE}/api/deal`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Failed to add deal");
                // If renewal, link the parent to this new deal
                if (renewingParentId) {
                    await fetch(`${API_BASE}/api/deal/${renewingParentId}`, {
                        method: "PUT",
                        headers,
                        body: JSON.stringify({ renewalDealId: resData._id }),
                    });
                }
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

    const showNextRenewal = (deal: DealRecord) => {
        if (!deal.renewalDealId) return;
        const renewal = deals.find(d => d._id === deal.renewalDealId);
        if (renewal) startEdit(renewal);
    };

    const showPreviousRenewal = (deal: DealRecord) => {
        if (!deal.parentDealId) return;
        const parent = deals.find(d => d._id === deal.parentDealId);
        if (parent) startEdit(parent);
    };

    const handleRenew = (deal: DealRecord) => {
        setEditingDeal(null);
        setRenewingParentId(deal._id);
        const today = new Date().toISOString().split("T")[0];
        setFormData({
            ...emptyForm,
            broker: deal.broker?._id ?? "",
            typeOfDeal: "renewal",
            fundedDate: today,
        });
        setFormError(null);
        setIsAdding(true);
    };

    // Build hierarchical deal list: root deals followed by their renewal chains, indented
    const buildOrderedDeals = (): { deal: DealRecord; indent: boolean }[] => {
        const result: { deal: DealRecord; indent: boolean }[] = [];
        // Root deals have no parentDealId
        const roots = deals.filter(d => !d.parentDealId);
        for (const root of roots) {
            result.push({ deal: root, indent: false });
            // Walk the renewal chain from this root
            let currentId = root.renewalDealId;
            while (currentId) {
                const renewal = deals.find(d => d._id === currentId);
                if (!renewal) break;
                result.push({ deal: renewal, indent: true });
                currentId = renewal.renewalDealId;
            }
        }
        return result;
    };
    const orderedDeals = buildOrderedDeals();

    const calcTotalPayback = (funded: string, factor: string): string => {
        const f = parseFloat(stripCommas(funded)), r = parseFloat(stripCommas(factor));
        return !isNaN(f) && !isNaN(r) ? (f * r).toFixed(2) : "";
    };

    const calcPayment = (total: string, term: string, weekly: boolean): string => {
        const t = parseFloat(stripCommas(total)), l = parseInt(term);
        if (!isNaN(t) && !isNaN(l) && l > 0)
            return weekly ? (t / (l / 5)).toFixed(2) : (t / l).toFixed(2);
        return "";
    };

    const calcAmountOwed = (fundedDate: string, defaultDate: string, paymentAmount: string, totalPayback: string, weekly: boolean): string => {
        if (!fundedDate || !defaultDate || !paymentAmount || !totalPayback) return "";
        const days = Math.floor((parseDateUTC(defaultDate) - parseDateUTC(fundedDate)) / 86400000);
        if (days <= 0) return "";
        const pmtNum = parseFloat(stripCommas(paymentAmount));
        const totalNum = parseFloat(stripCommas(totalPayback));
        if (isNaN(pmtNum) || isNaN(totalNum)) return "";
        const paymentsMade = weekly ? Math.floor(days / 5) : days;
        const owed = totalNum - paymentsMade * pmtNum;
        return (owed > 0 ? owed : 0).toFixed(2);
    };

    const showForm = editingDeal !== null;

    const formGrid = (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 1rem" }}>
            {/* Row 1: Broker | Position | MCA History | (empty) */}
            <div className="form-row" title="Select the broker associated with this deal">
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
            <div className="form-row" title="Number of lenders assigned to this deal">
                <label>Position</label>
                <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
            </div>
            <div className="form-row" title="Has this client had a previous Merchant Cash Advance?">
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
            <div />

            {/* Row 2: Funded Date | Funded Amount | Origination Fee | Net Funded Amount */}
            <div className="form-row" title="Date the deal was funded">
                <label>Funded Date</label>
                <input type="date" value={formData.fundedDate} onChange={(e) => setFormData({ ...formData, fundedDate: e.target.value })} />
            </div>
            <div className="form-row" title="Total dollar amount funded for this deal">
                <label>Funded Amount</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.fundedAmount}
                        onFocus={() => setFormData(f => ({ ...f, fundedAmount: stripCommas(f.fundedAmount) }))}
                        onChange={(e) => {
                            const funded = stripCommas(e.target.value);
                            const fundedNum = parseFloat(funded);
                            const feeNum = parseFloat(stripCommas(formData.originationFee));
                            const net = funded !== "" && formData.originationFee !== ""
                                ? (fundedNum - feeNum).toFixed(2)
                                : funded !== "" ? parseFloat(funded).toFixed(2) : "";
                            const pct = funded !== "" && formData.originationFee !== "" && fundedNum !== 0
                                ? ((feeNum / fundedNum) * 100).toFixed(2)
                                : formData.originationFeePercent;
                            const commission = funded !== "" && formData.brokerFee !== ""
                                ? ((parseFloat(formData.brokerFee) / 100) * fundedNum).toFixed(2)
                                : formData.brokerCommission;
                            const total = calcTotalPayback(funded, formData.factorRate);
                            const weekly = formData.weeklyOrDailyPayment === "true";
                            const payment = calcPayment(total, formData.loanTerm, weekly);
                            const owed = formData.hasDefaulted ? calcAmountOwed(funded, formData.defaultDate, payment, total, weekly) : "";
                            setFormData({ ...formData, fundedAmount: funded, netFundedAmount: net, originationFeePercent: pct, brokerCommission: commission, totalPaybackAmount: total, paymentAmount: payment, amountOwedAsOfDefault: owed });
                        }}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, fundedAmount: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Fee charged for originating the deal. Enter as % or $; the other is calculated automatically. Net Funded = Funded Amount - Origination Fee">
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
                                const fundedNum = parseFloat(stripCommas(formData.fundedAmount));
                                const fee = pct !== "" && formData.fundedAmount !== ""
                                    ? ((pctNum / 100) * fundedNum).toFixed(2)
                                    : stripCommas(formData.originationFee);
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
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={formData.originationFee}
                            onFocus={() => setFormData(f => ({ ...f, originationFee: stripCommas(f.originationFee) }))}
                            onChange={(e) => {
                                const fee = stripCommas(e.target.value);
                                const feeNum = parseFloat(fee);
                                const fundedNum = parseFloat(stripCommas(formData.fundedAmount));
                                const pct = fee !== "" && formData.fundedAmount !== "" && fundedNum !== 0
                                    ? ((feeNum / fundedNum) * 100).toFixed(2)
                                    : formData.originationFeePercent;
                                const net = fee !== "" && formData.fundedAmount !== ""
                                    ? (fundedNum - feeNum).toFixed(2)
                                    : formData.fundedAmount !== "" ? parseFloat(stripCommas(formData.fundedAmount)).toFixed(2) : "";
                                setFormData({ ...formData, originationFee: fee, originationFeePercent: pct, netFundedAmount: net });
                            }}
                            onBlur={(e) => {
                                const v = parseFloat(stripCommas(e.target.value));
                                if (!isNaN(v)) setFormData((f) => ({ ...f, originationFee: formatDollar(v.toFixed(2)) }));
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="form-row" title="Calculated: Funded Amount minus Origination Fee">
                <label>Net Funded Amount</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={formatDollar(formData.netFundedAmount)} disabled />
                </div>
            </div>

            {/* Row 3: Buy Rate | Broker Fee | Broker Commission | Factor Rate */}
            <div className="form-row" title="The base rate charged to the borrower before broker fees">
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
                            ? (buyNum + feeNum / 100).toFixed(2)
                            : buy !== "" ? buy : "";
                        const total = calcTotalPayback(formData.fundedAmount, factor);
                        const weekly = formData.weeklyOrDailyPayment === "true";
                        const payment = calcPayment(total, formData.loanTerm, weekly);
                        const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, total, weekly) : "";
                        setFormData({ ...formData, buyRate: buy, factorRate: factor, totalPaybackAmount: total, paymentAmount: payment, amountOwedAsOfDefault: owed });
                    }}
                />
            </div>
            <div className="form-row" title="Broker's fee as a percentage. Commission = (Broker Fee / 100) x Funded Amount">
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
                                ? (buyNum + feeNum / 100).toFixed(2)
                                : formData.buyRate !== "" ? formData.buyRate : "";
                            const commission = fee !== "" && formData.fundedAmount !== ""
                                ? ((feeNum / 100) * parseFloat(stripCommas(formData.fundedAmount))).toFixed(2)
                                : formData.brokerCommission;
                            const total = calcTotalPayback(formData.fundedAmount, factor);
                            const weekly = formData.weeklyOrDailyPayment === "true";
                            const payment = calcPayment(total, formData.loanTerm, weekly);
                            const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, total, weekly) : "";
                            setFormData({ ...formData, brokerFee: fee, factorRate: factor, brokerCommission: commission, totalPaybackAmount: total, paymentAmount: payment, amountOwedAsOfDefault: owed });
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Calculated: (Broker Fee % / 100) x Funded Amount">
                <label>Broker Commission</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={formatDollar(formData.brokerCommission)} disabled />
                </div>
            </div>
            <div className="form-row" title="Calculated: Buy Rate + (Broker Fee / 100)">
                <label>Factor Rate</label>
                <input type="number" step="0.01" value={formData.factorRate} disabled />
            </div>

            {/* Row 4: Payment Frequency | Loan Term | Total Payback | Payment Amount */}
            <div className="form-row" title="How often payments are made: Daily or Weekly">
                <label>Payment Frequency</label>
                <select
                    value={formData.weeklyOrDailyPayment}
                    onChange={(e) => {
                        const weekly = e.target.value === "true";
                        const payment = calcPayment(formData.totalPaybackAmount, formData.loanTerm, weekly);
                        const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, formData.totalPaybackAmount, weekly) : "";
                        setFormData({ ...formData, weeklyOrDailyPayment: e.target.value, paymentAmount: payment, amountOwedAsOfDefault: owed });
                    }}
                >
                    <option value="false">Daily</option>
                    <option value="true">Weekly</option>
                </select>
            </div>
            <div className="form-row" title="Duration of the loan in calendar days">
                <label>Loan Term (days)</label>
                <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={formData.loanTerm}
                    onChange={(e) => {
                        const term = e.target.value;
                        const weekly = formData.weeklyOrDailyPayment === "true";
                        const payment = calcPayment(formData.totalPaybackAmount, term, weekly);
                        const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, formData.totalPaybackAmount, weekly) : "";
                        setFormData({ ...formData, loanTerm: term, paymentAmount: payment, amountOwedAsOfDefault: owed });
                    }}
                />
            </div>
            <div className="form-row" title="Calculated: Weekly = Total Payback / (Term / 5), Daily = Total Payback / Term">
                <label>Payment Amount</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={formatDollar(formData.paymentAmount)} disabled />
                </div>
            </div>
            <div className="form-row" title="Calculated: Funded Amount x Factor Rate">
                <label>Total Payback</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={formatDollar(formData.totalPaybackAmount)} disabled />
                </div>
            </div>

            {/* Row 5: Total Cash Out | Total Payback w/ Fees & Expenses | Net Profit | (empty) */}
            <div className="form-row" title="Calculated: Net Funded Amount + Broker Commission + Miscellaneous Expenses">
                <label>Total Cash Out</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={(() => {
                        const net = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                        const comm = parseFloat(stripCommas(formData.brokerCommission)) || 0;
                        const misc = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                        const total = net + comm + misc;
                        return total > 0 ? formatDollar(total.toFixed(2)) : "";
                    })()} disabled />
                </div>
            </div>
            <div className="form-row" title="Calculated: Total Payback + Miscellaneous Fees + Miscellaneous Expenses - Discount">
                <label>Total Payback w/ Fees &amp; Expenses</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={(() => {
                        const payback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                        const fees = parseFloat(stripCommas(formData.miscellaneousFees)) || 0;
                        const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                        const disc = parseFloat(stripCommas(formData.discount)) || 0;
                        const total = payback + fees + expenses - disc;
                        return total > 0 ? formatDollar(total.toFixed(2)) : "";
                    })()} disabled />
                </div>
            </div>
            <div className="form-row" title="Net profit from this deal after all costs and expenses">
                <label>Net Profit</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.netProfit}
                        onFocus={() => setFormData(f => ({ ...f, netProfit: stripCommas(f.netProfit) }))}
                        onChange={(e) => setFormData({ ...formData, netProfit: stripCommas(e.target.value) })}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, netProfit: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div />

            {/* Row 6: Misc Fees | Misc Expenses | Discount | (empty) */}
            <div className="form-row" title="Any additional miscellaneous fees applied to this deal">
                <label>Miscellaneous Fees</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.miscellaneousFees}
                        onFocus={() => setFormData(f => ({ ...f, miscellaneousFees: stripCommas(f.miscellaneousFees) }))}
                        onChange={(e) => setFormData({ ...formData, miscellaneousFees: stripCommas(e.target.value) })}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, miscellaneousFees: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Any additional miscellaneous expenses incurred on this deal">
                <label>Miscellaneous Expenses</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.miscellaneousExpenses}
                        onFocus={() => setFormData(f => ({ ...f, miscellaneousExpenses: stripCommas(f.miscellaneousExpenses) }))}
                        onChange={(e) => setFormData({ ...formData, miscellaneousExpenses: stripCommas(e.target.value) })}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, miscellaneousExpenses: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Discount amount applied to this deal">
                <label>Discount</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.discount}
                        onFocus={() => setFormData(f => ({ ...f, discount: stripCommas(f.discount) }))}
                        onChange={(e) => setFormData({ ...formData, discount: stripCommas(e.target.value) })}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, discount: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div />

            {/* Row 6: Outstanding Amount Owed | Amount Paid In | Expected ROI | Current ROI */}
            <div className="form-row" title="Calculated: Total Payback w/ Fees & Expenses - Amount Paid In">
                <label>Outstanding Amount Owed</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={(() => {
                        const payback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                        const fees = parseFloat(stripCommas(formData.miscellaneousFees)) || 0;
                        const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                        const disc = parseFloat(stripCommas(formData.discount)) || 0;
                        const totalWithFees = payback + fees + expenses - disc;
                        const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                        const owed = totalWithFees - paidIn;
                        return totalWithFees > 0 ? formatDollar((owed > 0 ? owed : 0).toFixed(2)) : "";
                    })()} disabled />
                </div>
            </div>
            <div className="form-row" title="Total amount paid in by the borrower to date">
                <label>Amount Paid In</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.amountPaidIn}
                        onFocus={() => setFormData(f => ({ ...f, amountPaidIn: stripCommas(f.amountPaidIn) }))}
                        onChange={(e) => setFormData({ ...formData, amountPaidIn: stripCommas(e.target.value) })}
                        onBlur={(e) => {
                            const v = parseFloat(stripCommas(e.target.value));
                            if (!isNaN(v)) setFormData((f) => ({ ...f, amountPaidIn: formatDollar(v.toFixed(2)) }));
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Expected Return on Investment percentage for this deal">
                <label>Expected ROI</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">%</span>
                    <input type="number" step="0.01" placeholder="0.00" value={formData.roi} onChange={(e) => setFormData({ ...formData, roi: e.target.value })} />
                </div>
            </div>
            <div className="form-row" title="Current Return on Investment based on actual performance">
                <label>Current ROI</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">%</span>
                    <input type="number" step="0.01" placeholder="0.00" value={formData.currentRoi} onChange={(e) => setFormData({ ...formData, currentRoi: e.target.value })} />
                </div>
            </div>

            {/* Row 7: Default Date/Days | Amount Owed as of Default | (empty) | (empty) */}
            <div className="form-row" title="Check to mark as defaulted. Date and days since funded are linked; changing one updates the other">
                <label>Default Date / Days</label>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <input
                        type="checkbox"
                        style={{ width: "auto", flexShrink: 0 }}
                        checked={formData.hasDefaulted}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            const today = new Date().toISOString().split("T")[0];
                            const dateVal = checked ? today : formData.defaultDate;
                            let days = "";
                            if (checked && dateVal && formData.fundedDate) {
                                const diff = parseDateUTC(dateVal) - parseDateUTC(formData.fundedDate);
                                days = Math.floor(diff / 86400000).toString();
                            }
                            const owed = checked ? calcAmountOwed(formData.fundedDate, dateVal, formData.paymentAmount, formData.totalPaybackAmount, formData.weeklyOrDailyPayment === "true") : "";
                            setFormData({ ...formData, hasDefaulted: checked, defaultDate: dateVal, defaultDays: days, amountOwedAsOfDefault: owed });
                        }}
                    />
                    <input
                        type="date"
                        style={{ flex: 2 }}
                        value={formData.defaultDate}
                        disabled={!formData.hasDefaulted}
                        onChange={(e) => {
                            const dateVal = e.target.value;
                            let days = "";
                            if (dateVal && formData.fundedDate) {
                                const diff = parseDateUTC(dateVal) - parseDateUTC(formData.fundedDate);
                                days = Math.floor(diff / 86400000).toString();
                            }
                            const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, dateVal, formData.paymentAmount, formData.totalPaybackAmount, formData.weeklyOrDailyPayment === "true") : "";
                            setFormData({ ...formData, defaultDate: dateVal, defaultDays: days, amountOwedAsOfDefault: owed });
                        }}
                    />
                    <input
                        type="number"
                        style={{ flex: 1, minWidth: 0 }}
                        placeholder="Days"
                        value={formData.defaultDays}
                        disabled={!formData.hasDefaulted}
                        onChange={(e) => {
                            const daysVal = e.target.value;
                            let dateStr = "";
                            if (daysVal !== "" && formData.fundedDate) {
                                const ms = parseDateUTC(formData.fundedDate) + parseInt(daysVal) * 86400000;
                                dateStr = new Date(ms).toISOString().split("T")[0];
                            }
                            const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, dateStr, formData.paymentAmount, formData.totalPaybackAmount, formData.weeklyOrDailyPayment === "true") : "";
                            setFormData({ ...formData, defaultDays: daysVal, defaultDate: dateStr, amountOwedAsOfDefault: owed });
                        }}
                    />
                </div>
            </div>
            <div className="form-row" title="Calculated: Total Payback minus payments made from Funded Date to Default Date">
                <label>Amount Owed as of Default</label>
                <div className="input-prefixed">
                    <span className="input-prefix-symbol">$</span>
                    <input type="text" value={formatDollar(formData.amountOwedAsOfDefault)} disabled />
                </div>
            </div>
            <div />
            <div />

            {/* Row 7: Renewal-specific fields (only shown for renewals) */}
            {formData.typeOfDeal === "renewal" && (
                <>
                    <div className="form-row" title="Balance rolled over from the previous deal into this renewal">
                        <label>Rolled Balance</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={formData.rolledBalance}
                                onFocus={() => setFormData(f => ({ ...f, rolledBalance: stripCommas(f.rolledBalance) }))}
                                onChange={(e) => setFormData({ ...formData, rolledBalance: stripCommas(e.target.value) })}
                                onBlur={(e) => {
                                    const v = parseFloat(stripCommas(e.target.value));
                                    if (!isNaN(v)) setFormData((f) => ({ ...f, rolledBalance: formatDollar(v.toFixed(2)) }));
                                }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="New cash disbursed to the client as part of this renewal, excluding the rolled balance">
                        <label>Net New Cash Out</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={formData.netNewCashOut}
                                onFocus={() => setFormData(f => ({ ...f, netNewCashOut: stripCommas(f.netNewCashOut) }))}
                                onChange={(e) => setFormData({ ...formData, netNewCashOut: stripCommas(e.target.value) })}
                                onBlur={(e) => {
                                    const v = parseFloat(stripCommas(e.target.value));
                                    if (!isNaN(v)) setFormData((f) => ({ ...f, netNewCashOut: formatDollar(v.toFixed(2)) }));
                                }}
                            />
                        </div>
                    </div>
                    <div />
                    <div />
                </>
            )}
        </div>
    );

    return (
        <>
        <div className="dialog-overlay">
            <div className="dialog dialog-extra-wide">
                <div className="dialog-header">
                    <h2><img src="/hand-money2.png" alt="" style={{ height: "40px", width: "auto", verticalAlign: "middle", marginRight: "8px" }} />Deals</h2>
                    <button className="dialog-close" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="dialog-error">{error}</div>}

                <div className="dialog-body">
                    <div className="dialog-toolbar" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <label style={{ margin: 0 }}>Funded Client:</label>
                        <select
                            value={selectedCorpId}
                            onChange={(e) => handleCorpChange(e.target.value)}
                            style={{ flex: 1 }}
                            disabled={isAdding || showForm}
                        >
                            <option value="">-- Select Corporation --</option>
                            {corporations.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.businessName}{c.dbaName ? ` (${c.dbaName})` : ""}
                                </option>
                            ))}
                        </select>
                        <button className="btn" onClick={startAdd} disabled={!selectedCorpId || isAdding || showForm}>
                            Add Deal
                        </button>
                    </div>

                    {selectedCorpId && (
                        <table className="dialog-table" style={{ marginTop: "1rem" }}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th style={{ textAlign: "center" }}>Broker</th>
                                    <th style={{ textAlign: "center" }}>Type</th>
                                    <th style={{ textAlign: "center" }}>State</th>
                                    <th style={{ textAlign: "center" }}>Funded Date</th>
                                    <th style={{ textAlign: "right" }}>Funded Amount</th>
                                    <th style={{ textAlign: "right" }}>Net Funded</th>
                                    <th style={{ textAlign: "center" }}>Term (days)</th>
                                    <th style={{ textAlign: "center" }}>Factor Rate</th>
                                    <th style={{ textAlign: "right" }}>Total Payback</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedDeals.map(({ deal, indent }) => (
                                    <tr key={deal._id} className={editingDeal?._id === deal._id ? "selected-row" : ""} style={indent ? { backgroundColor: "#f0e6f6" } : undefined} onDoubleClick={() => startEdit(deal)}>
                                        <td style={indent ? { paddingLeft: "1.5rem" } : undefined}>
                                            {indent ? "↳ " : ""}{deal.entityId ?? "-"}
                                        </td>
                                        <td style={{ textAlign: "center" }}>{deal.broker?.brokerName ?? "-"}</td>
                                        <td style={{ textAlign: "center", textTransform: "capitalize" }}>{deal.typeOfDeal ?? "-"}</td>
                                        <td style={{ textAlign: "center", textTransform: "capitalize" }}>{deal.dealState ?? "-"}</td>
                                        <td style={{ textAlign: "center" }}>{formatDate(deal.fundedDate)}</td>
                                        <td style={{ textAlign: "right" }}>{formatCurrency(deal.fundedAmount)}</td>
                                        <td style={{ textAlign: "right" }}>{formatCurrency(deal.netFundedAmount)}</td>
                                        <td style={{ textAlign: "center" }}>{deal.loanTerm ?? "-"}</td>
                                        <td style={{ textAlign: "center" }}>{deal.factorRate ?? "-"}</td>
                                        <td style={{ textAlign: "right" }}>{formatCurrency(deal.totalPaybackAmount)}</td>
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-success" onClick={() => startEdit(deal)} disabled={isAdding || showForm}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(deal)} disabled={isAdding || showForm || !!deal.renewalDealId}>Delete</button>
                                            <button className="btn btn-sm" onClick={() => handleRenew(deal)} disabled={isAdding || showForm || !!deal.renewalDealId}>Renew</button>
                                        </td>
                                    </tr>
                                ))}
                                {deals.length === 0 && (
                                    <tr><td colSpan={11} className="empty-row">No deals found for this corporation</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                </div>
            </div>
        </div>

        {showForm && editingDeal && (
            <div className="dialog-overlay" style={{ zIndex: 2001 }}>
                <div className="dialog dialog-extra-wide">
                    <div className="dialog-header">
                        <h2><img src="/money-bag-gold.png" alt="" style={{ height: "40px", width: "auto", verticalAlign: "middle", marginRight: "8px" }} />{editingDeal.parentDealId ? "Edit Deal Renewal" : "Edit New Deal"} — {editingDeal.entityId ?? ""} <span style={{ fontSize: "0.7em", fontWeight: "normal", textTransform: "capitalize", opacity: 0.8 }}>({editingDeal.dealState ?? "unknown"})</span></h2>
                        <button className="dialog-close" onClick={cancelForm}>&times;</button>
                    </div>
                    {formError && <div className="dialog-error">{formError}</div>}
                    <div className="dialog-body">
                        <div className="dialog-form">
                            {formGrid}
                        </div>
                    </div>
                    <div className="dialog-footer">
                        <button className="btn btn-primary" onClick={handleSave}>Save</button>
                        <button className="btn" onClick={() => handleRenew(editingDeal)} disabled={!!editingDeal.renewalDealId}>Renew Deal</button>
                        <button className="btn" onClick={() => showPreviousRenewal(editingDeal)} disabled={!editingDeal.parentDealId}>Show Previous Renewal</button>
                        <button className="btn" onClick={() => showNextRenewal(editingDeal)} disabled={!editingDeal.renewalDealId}>Show Next Renewal</button>
                        <button className="btn" onClick={cancelForm}>Cancel</button>
                    </div>
                </div>
            </div>
        )}

        {isAdding && (
            <div className="dialog-overlay" style={{ zIndex: 2001 }}>
                <div className="dialog dialog-extra-wide">
                    <div className="dialog-header">
                        <h2><img src="/money-present.png" alt="" style={{ height: "40px", width: "auto", verticalAlign: "middle", marginRight: "8px" }} />{renewingParentId ? "Add Renewal Deal" : "Add New Deal"}</h2>
                        <button className="dialog-close" onClick={cancelForm}>&times;</button>
                    </div>
                    {formError && <div className="dialog-error">{formError}</div>}
                    <div className="dialog-body">
                        <div className="dialog-form">
                            {formGrid}
                        </div>
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
