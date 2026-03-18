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
import type { PositionRecord } from "../types/positionRecord";
import type { FunderRecord } from "../types/funderRecord";
import ComboBox from "../customwidgets/ComboBox";

const API_BASE =
    import.meta.env.VITE_ENV_IS_TEST_ENV === "true"
        ? import.meta.env.VITE_ENV_TEST_ENV_URL
        : "";

interface DealsDlgProps {
    onClose: () => void;
}

interface DealFormData {
    grossMonthlyRevenue: string;
    monthlyPayment: string;
    monthlyPaymentPercent: string;
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
    settledByRenewal: string;
    totalCashOut: string;
    totalPaybackWithFeesAndExpenses: string;
    netProfit: string;
    renewalDate: string;
    rolledBalance: string;
    netNewCashOut: string;
    roi: string;
    currentRoi: string;
}

const emptyForm: DealFormData = {
    grossMonthlyRevenue: "",
    monthlyPayment: "",
    monthlyPaymentPercent: "",
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
    settledByRenewal: "",
    totalCashOut: "",
    totalPaybackWithFeesAndExpenses: "",
    netProfit: "",
    renewalDate: "",
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

function isNegativeValue(value: string): boolean {
    if (!value) return false;
    const num = parseFloat(value.replace(/,/g, ""));
    return !isNaN(num) && num < 0;
}

/** Read-only input that shows red text when the value is negative */
function ReadOnlyInput({ value, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    const strVal = (value ?? "") as string;
    return <input type="text" {...props} value={strVal} disabled className={isNegativeValue(strVal) ? "negative-value" : ""} />;
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
    const { token, user: currentUser } = useAuth();
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
    const [positions, setPositions] = useState<PositionRecord[]>([]);
    const [funders, setFunders] = useState<FunderRecord[]>([]);
    const [isAddingPosition, setIsAddingPosition] = useState(false);
    const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
    const [positionForm, setPositionForm] = useState({ frequency: "", funder: "", monthlyPaymentAmount: "", fundedDate: "", status: true });
    const [showCompoundInfo, setShowCompoundInfo] = useState(false);

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    useEffect(() => {
        const fetchInit = async () => {
            try {
                const [corpRes, brokerRes, funderRes] = await Promise.all([
                    fetch(`${API_BASE}/api/corporation`, { headers }),
                    fetch(`${API_BASE}/api/broker`, { headers }),
                    fetch(`${API_BASE}/api/funder?officeAcronym=${currentUser?.officeAcronym ?? ""}`, { headers }),
                ]);
                if (!corpRes.ok) throw new Error("Failed to fetch corporations");
                if (!brokerRes.ok) throw new Error("Failed to fetch brokers");
                if (!funderRes.ok) throw new Error("Failed to fetch funders");
                setCorporations(await corpRes.json());
                setBrokers(await brokerRes.json());
                setFunders(await funderRes.json());
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
            grossMonthlyRevenue: (() => {
                if (deal.grossMonthlyRevenue) return formatDollar(deal.grossMonthlyRevenue.toFixed(2));
                // For renewals with no value, inherit from parent
                if (deal.parentDealId) {
                    const parent = deals.find(d => d._id === deal.parentDealId);
                    if (parent?.grossMonthlyRevenue) return formatDollar(parent.grossMonthlyRevenue.toFixed(2));
                }
                return "";
            })(),
            monthlyPayment: deal.monthlyPayment != null ? formatDollar(deal.monthlyPayment.toFixed(2)) : "",
            monthlyPaymentPercent: deal.monthlyPaymentPercent?.toFixed(2) ?? "",
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
            settledByRenewal: deal.settledByRenewal != null ? formatDollar(deal.settledByRenewal.toFixed(2)) : "",
            totalCashOut: deal.totalCashOut != null ? formatDollar(deal.totalCashOut.toFixed(2)) : "",
            totalPaybackWithFeesAndExpenses: deal.totalPaybackWithFeesAndExpenses != null ? formatDollar(deal.totalPaybackWithFeesAndExpenses.toFixed(2)) : "",
            netProfit: deal.netProfit != null ? formatDollar(deal.netProfit.toFixed(2)) : "",
            renewalDate: toDateInput(deal.renewalDate),
            rolledBalance: (() => {
                if (deal.rolledBalance) return formatDollar(deal.rolledBalance.toFixed(2));
                // For renewals with no value, calculate from parent's Outstanding Amount Owed
                if (deal.parentDealId) {
                    const parent = deals.find(d => d._id === deal.parentDealId);
                    if (parent) {
                        const payback = parent.totalPaybackAmount || ((parent.fundedAmount || 0) * (parent.factorRate || 0));
                        const fees = parent.miscellaneousFees || 0;
                        const expenses = parent.miscellaneousExpenses || 0;
                        const disc = parent.discount || 0;
                        const totalWithFees = payback + fees + expenses - disc;
                        const paidIn = parent.amountPaidIn || 0;
                        const settled = parent.settledByRenewal || 0;
                        const outstanding = totalWithFees - paidIn - settled;
                        if (outstanding > 0) return formatDollar(outstanding.toFixed(2));
                    }
                }
                return "";
            })(),
            netNewCashOut: deal.netNewCashOut != null ? formatDollar(deal.netNewCashOut.toFixed(2)) : "",
            roi: deal.roi?.toFixed(2) ?? "",
            currentRoi: deal.currentRoi?.toFixed(2) ?? "",
        });
        setFormError(null);
        // Fetch positions for this deal
        fetchPositions(deal._id);
    };

    const cancelForm = () => {
        setEditingDeal(null);
        setIsAdding(false);
        setRenewingParentId(null);
        setFormError(null);
        setPositions([]);
        setIsAddingPosition(false);
    };

    const fetchPositions = async (dealId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/position?dealId=${dealId}`, { headers });
            if (res.ok) setPositions(await res.json());
        } catch { /* ignore */ }
    };

    const handleAddPosition = async () => {
        const funderName = await ensureFunder(positionForm.funder);
        const newPos: PositionRecord = {
            _id: `temp_${Date.now()}`,
            position: positions.length + 1,
            frequency: positionForm.frequency,
            funder: funderName,
            monthlyPaymentAmount: positionForm.monthlyPaymentAmount ? parseFloat(stripCommas(positionForm.monthlyPaymentAmount)) : 0,
            fundedDate: positionForm.fundedDate || "",
            status: positionForm.status,
        };

        if (editingDeal) {
            // Save to DB immediately when editing an existing deal
            const payload = { dealId: editingDeal._id, ...newPos, _id: undefined };
            try {
                const res = await fetch(`${API_BASE}/api/position`, { method: "POST", headers, body: JSON.stringify(payload) });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add position"); }
                await fetchPositions(editingDeal._id);
                await fetchDeals(selectedCorpId);
            } catch (err) {
                setFormError(err instanceof Error ? err.message : "Failed to add position");
                return;
            }
        } else {
            // Local state only for new deals — will be saved when the deal is saved
            setPositions([...positions, newPos]);
        }

        setIsAddingPosition(false);
        setPositionForm({ frequency: "", funder: "", monthlyPaymentAmount: "", fundedDate: "", status: true });
    };

    const handleDeletePosition = async (posId: string) => {
        if (!confirm("Delete this position?")) return;
        if (posId.startsWith("temp_")) {
            // Local-state only position (not yet saved)
            setPositions(positions.filter(p => p._id !== posId));
            return;
        }
        if (!editingDeal) return;
        try {
            const res = await fetch(`${API_BASE}/api/position/${posId}?dealId=${editingDeal._id}`, { method: "DELETE", headers });
            if (!res.ok) throw new Error("Failed to delete position");
            await fetchPositions(editingDeal._id);
            await fetchDeals(selectedCorpId);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Delete position failed");
        }
    };

    const ensureFunder = async (name: string): Promise<string> => {
        if (!name.trim()) return "";
        // Check if funder already exists (case-insensitive)
        const titleCased = name.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
        const existing = funders.find(f => f.funderName === titleCased);
        if (existing) return titleCased;
        // Create new funder
        try {
            const res = await fetch(`${API_BASE}/api/funder`, { method: "POST", headers, body: JSON.stringify({ funderName: name, officeAcronym: currentUser?.officeAcronym }) });
            if (res.ok) {
                const newFunder = await res.json();
                setFunders(prev => [...prev, newFunder].sort((a, b) => a.funderName.localeCompare(b.funderName)));
                return newFunder.funderName;
            }
        } catch { /* ignore */ }
        return titleCased;
    };

    const calcDealTotalPaybackWithFees = (d: DealRecord): number => {
        const payback = (d.fundedAmount || 0) * (d.factorRate || 0);
        return payback + (d.miscellaneousFees || 0) + (d.miscellaneousExpenses || 0) - (d.discount || 0);
    };

    // Total money out of the bank for a deal = Net to client + Broker Commission
    // Root: Net Funded + Commission
    // Renewal: (Net Funded - Rolled Balance) + Commission
    const calcDealTotalMoneyOut = (d: DealRecord): number => {
        const netFunded = d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0));
        const rolled = d.rolledBalance || 0;
        const netToClient = d.parentDealId ? Math.max(netFunded - rolled, 0) : netFunded;
        const comm = d.brokerCommission || ((d.brokerFee || 0) / 100 * (d.fundedAmount || 0));
        return netToClient + comm;
    };

    // Alias for clarity in different contexts
    const calcDealNetNewCapital = calcDealTotalMoneyOut;
    const calcDealTotalNetNewCashOut = calcDealTotalMoneyOut;

    const startEditPosition = (pos: PositionRecord) => {
        setEditingPositionId(pos._id);
        setPositionForm({
            frequency: pos.frequency || "",
            funder: pos.funder || "",
            monthlyPaymentAmount: pos.monthlyPaymentAmount?.toString() ?? "",
            fundedDate: toDateInput(pos.fundedDate),
            status: pos.status ?? true,
        });
    };

    const handleSavePosition = async () => {
        if (!editingPositionId) return;
        const funderName = await ensureFunder(positionForm.funder);
        const updated = {
            frequency: positionForm.frequency,
            funder: funderName,
            monthlyPaymentAmount: positionForm.monthlyPaymentAmount ? parseFloat(stripCommas(positionForm.monthlyPaymentAmount)) : null,
            fundedDate: positionForm.fundedDate || null,
            status: positionForm.status,
        };

        if (editingPositionId.startsWith("temp_")) {
            // Update local-state position
            setPositions(positions.map(p => p._id === editingPositionId ? { ...p, ...updated, monthlyPaymentAmount: updated.monthlyPaymentAmount ?? 0, fundedDate: updated.fundedDate ?? "" } : p));
        } else if (editingDeal) {
            try {
                const res = await fetch(`${API_BASE}/api/position/${editingPositionId}`, { method: "PUT", headers, body: JSON.stringify(updated) });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update position"); }
                await fetchPositions(editingDeal._id);
            } catch (err) {
                setFormError(err instanceof Error ? err.message : "Failed to update position");
                return;
            }
        }
        setEditingPositionId(null);
        setPositionForm({ frequency: "", funder: "", monthlyPaymentAmount: "", fundedDate: "", status: true });
    };

    const handleSave = async () => {
        setFormError(null);
        if (!selectedCorpId) { setFormError("No corporation selected."); return; }

        const payload = {
            corporationId: selectedCorpId,
            grossMonthlyRevenue: formData.grossMonthlyRevenue ? parseFloat(stripCommas(formData.grossMonthlyRevenue)) : null,
            ...(() => {
                const freqMult = (freq: string) => freq === "Daily" ? 20 : freq === "Bi-Weekly" ? 10 : freq === "Weekly" ? 4 : 1;
                const existing = positions.filter(p => p.status).reduce((sum, p) => sum + (p.monthlyPaymentAmount || 0) * freqMult(p.frequency), 0);
                const pmtAmt = parseFloat(stripCommas(formData.paymentAmount)) || 0;
                const thisDealMonthly = formData.weeklyOrDailyPayment === "true" ? pmtAmt * (52 / 12) : pmtAmt * (260 / 12);
                const newMonthly = existing + thisDealMonthly;
                const revNum = parseFloat(stripCommas(formData.grossMonthlyRevenue)) || 0;
                return {
                    existingMonthlyPayment: existing || null,
                    existingMonthlyPaymentPercent: existing > 0 && revNum > 0 ? parseFloat(((existing / revNum) * 100).toFixed(2)) : null,
                    monthlyPayment: thisDealMonthly || null,
                    monthlyPaymentPercent: thisDealMonthly > 0 && revNum > 0 ? parseFloat(((thisDealMonthly / revNum) * 100).toFixed(2)) : null,
                    newMonthlyPayment: newMonthly || null,
                    newMonthlyPaymentPercent: newMonthly > 0 && revNum > 0 ? parseFloat(((newMonthly / revNum) * 100).toFixed(2)) : null,
                };
            })(),
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
            settledByRenewal: formData.settledByRenewal ? parseFloat(stripCommas(formData.settledByRenewal)) : null,
            totalCashOut: formData.totalCashOut ? parseFloat(stripCommas(formData.totalCashOut)) : null,
            totalPaybackWithFeesAndExpenses: formData.totalPaybackWithFeesAndExpenses ? parseFloat(stripCommas(formData.totalPaybackWithFeesAndExpenses)) : null,
            netProfit: formData.netProfit ? parseFloat(stripCommas(formData.netProfit)) : null,
            renewalDate: formData.renewalDate || null,
            rolledBalance: formData.rolledBalance ? parseFloat(stripCommas(formData.rolledBalance)) : null,
            netNewCashOut: formData.netNewCashOut ? parseFloat(stripCommas(formData.netNewCashOut)) : null,
            roi: formData.roi ? parseFloat(formData.roi) : null,
            currentRoi: formData.currentRoi ? parseFloat(formData.currentRoi) : null,
            // Compound values will be recalculated after save when the chain is refreshed
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
                        body: JSON.stringify({
                            renewalDealId: resData._id,
                            settledByRenewal: formData.rolledBalance ? parseFloat(stripCommas(formData.rolledBalance)) : 0,
                            renewalDate: new Date().toISOString().split("T")[0],
                            dealState: "renewed",
                        }),
                    });
                }
                // Save any pending local positions to the new deal
                for (const pos of positions.filter(p => p._id.startsWith("temp_"))) {
                    await fetch(`${API_BASE}/api/position`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            dealId: resData._id,
                            position: pos.position,
                            frequency: pos.frequency,
                            funder: pos.funder,
                            monthlyPaymentAmount: pos.monthlyPaymentAmount,
                            fundedDate: pos.fundedDate || null,
                            status: pos.status,
                        }),
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
            // Recalculate compound values for all deals in any renewal chains
            await recalcCompoundForAllChains();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Operation failed");
        }
    };

    const recalcCompoundForAllChains = async () => {
        // Re-fetch latest deals
        const res = await fetch(`${API_BASE}/api/deal?corporationId=${selectedCorpId}`, { headers });
        if (!res.ok) return;
        const latestDeals: DealRecord[] = await res.json();
        setDeals(latestDeals);

        // Find all root deals that have renewals
        const roots = latestDeals.filter(d => !d.parentDealId && d.renewalDealId);
        for (const root of roots) {
            // Build chain
            const chain: DealRecord[] = [root];
            let current = root;
            while (current.renewalDealId) {
                const next = latestDeals.find(d => d._id === current.renewalDealId);
                if (!next) break;
                chain.push(next);
                current = next;
            }
            if (chain.length < 2) continue;

            const totalFunded = chain.reduce((s, d) => s + (d.fundedAmount || 0), 0);
            const totalPayback = chain.reduce((s, d) => {
                const pb = (d.fundedAmount || 0) * (d.factorRate || 0);
                return s + pb + (d.miscellaneousFees || 0) + (d.miscellaneousExpenses || 0) - (d.discount || 0);
            }, 0);
            const totalCollected = chain.reduce((s, d) => s + (d.amountPaidIn || 0), 0);
            const netNewCap = chain.reduce((s, d) => {
                const netFunded = d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0));
                const netToClient = !d.parentDealId ? netFunded : Math.max(netFunded - (d.rolledBalance || 0), 0);
                const comm = d.brokerCommission || ((d.brokerFee || 0) / 100 * (d.fundedAmount || 0));
                return s + netToClient + comm;
            }, 0);
            const totalNetNewCashOut = chain.reduce((s, d) => {
                const netFunded = d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0));
                const rolled = d.rolledBalance || 0;
                const netNewCO = d.parentDealId ? Math.max(netFunded - rolled, 0) : netFunded;
                const comm = d.brokerCommission || ((d.brokerFee || 0) / 100 * (d.fundedAmount || 0));
                return s + netNewCO + comm;
            }, 0);
            const expectedProfit = totalPayback - totalNetNewCashOut;
            const currentProfit = totalCollected - totalNetNewCashOut;

            const compoundData = {
                compoundTotalFunded: totalFunded,
                compoundTotalPayback: totalPayback,
                compoundTotalCollected: totalCollected,
                compoundNetNewCapital: netNewCap,
                compoundExpectedProfit: expectedProfit,
                compoundCurrentProfit: currentProfit,
                compoundExpectedRoi: totalNetNewCashOut > 0 ? parseFloat((expectedProfit / totalNetNewCashOut * 100).toFixed(2)) : null,
                compoundExpectedRoiOnCapital: netNewCap > 0 ? parseFloat((expectedProfit / netNewCap * 100).toFixed(2)) : null,
                compoundCurrentRoi: totalNetNewCashOut > 0 ? parseFloat((currentProfit / totalNetNewCashOut * 100).toFixed(2)) : null,
                compoundCurrentRoiOnCapital: netNewCap > 0 ? parseFloat((currentProfit / netNewCap * 100).toFixed(2)) : null,
            };

            // Update all deals in the chain with compound data (skip state derivation)
            for (const d of chain) {
                await fetch(`${API_BASE}/api/deal/${d._id}`, {
                    method: "PUT", headers,
                    body: JSON.stringify({ ...compoundData, _skipStateDeriv: true }),
                });
            }
        }
        // Re-fetch to show updated values
        await fetchDeals(selectedCorpId);
    };

    const handleDelete = async (deal: DealRecord) => {
        if (!confirm(`Delete this deal?`)) return;
        try {
            // If this is a renewal, clear the parent deal's settledByRenewal and renewalDealId
            if (deal.parentDealId) {
                const parentDeal = deals.find(d => d._id === deal.parentDealId);
                if (parentDeal) {
                    await fetch(`${API_BASE}/api/deal/${deal.parentDealId}`, {
                        method: "PUT",
                        headers: { ...headers, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...parentDeal,
                            settledByRenewal: 0,
                            renewalDealId: null,
                            dealState: "active",
                        }),
                    });
                }
            }
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

        // Calculate Outstanding Amount Owed from parent deal for Rolled Balance
        const payback = deal.totalPaybackAmount || ((deal.fundedAmount || 0) * (deal.factorRate || 0));
        const fees = deal.miscellaneousFees || 0;
        const expenses = deal.miscellaneousExpenses || 0;
        const disc = deal.discount || 0;
        const totalWithFees = payback + fees + expenses - disc;
        const paidIn = deal.amountPaidIn || 0;
        const settled = deal.settledByRenewal || 0;
        const outstanding = totalWithFees - paidIn - settled;

        setFormData({
            ...emptyForm,
            broker: deal.broker?._id ?? "",
            typeOfDeal: "renewal",
            fundedDate: today,
            grossMonthlyRevenue: deal.grossMonthlyRevenue ? formatDollar(deal.grossMonthlyRevenue.toFixed(2)) : "",
            rolledBalance: outstanding > 0 ? formatDollar(outstanding.toFixed(2)) : "",
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
        <div>
            {/* Section 0: Current Client Financials */}
            <div className="form-section">
                <div className="form-section-header">Current Client Financials</div>
                <div className="form-grid-4">
                    <div className="form-row" title="Client's total gross monthly revenue">
                        <label>Gross Monthly Revenue</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.grossMonthlyRevenue}
                                onFocus={() => setFormData(f => ({ ...f, grossMonthlyRevenue: stripCommas(f.grossMonthlyRevenue) }))}
                                onChange={(e) => setFormData({ ...formData, grossMonthlyRevenue: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, grossMonthlyRevenue: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Sum of active position payment amounts adjusted for frequency ($ amount / % of Gross Monthly Revenue)">
                        <label>Existing Monthly Payment $ / %</label>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">$</span>
                                <ReadOnlyInput value={(() => {
                                    const freqMultiplier = (freq: string) => freq === "Daily" ? 20 : freq === "Bi-Weekly" ? 10 : freq === "Weekly" ? 4 : 1;
                                    const total = positions.filter(p => p.status).reduce((sum, p) => sum + (p.monthlyPaymentAmount || 0) * freqMultiplier(p.frequency), 0);
                                    return total > 0 ? formatDollar(total.toFixed(2)) : "";
                                })()} />
                            </div>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">%</span>
                                <ReadOnlyInput value={(() => {
                                    const freqMultiplier = (freq: string) => freq === "Daily" ? 20 : freq === "Bi-Weekly" ? 10 : freq === "Weekly" ? 4 : 1;
                                    const total = positions.filter(p => p.status).reduce((sum, p) => sum + (p.monthlyPaymentAmount || 0) * freqMultiplier(p.frequency), 0);
                                    const revNum = parseFloat(stripCommas(formData.grossMonthlyRevenue)) || 0;
                                    if (total <= 0 || revNum <= 0) return "";
                                    return ((total / revNum) * 100).toFixed(2);
                                })()} />
                            </div>
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Payment Amount x days per month ($ amount / % of Gross Monthly Revenue)">
                        <label>This Deal Monthly Payment $ / %</label>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">$</span>
                                <ReadOnlyInput value={(() => {
                                    const pmtAmt = parseFloat(stripCommas(formData.paymentAmount)) || 0;
                                    if (pmtAmt <= 0) return "";
                                    const monthly = formData.weeklyOrDailyPayment === "true" ? pmtAmt * (52 / 12) : pmtAmt * (260 / 12);
                                    return formatDollar(monthly.toFixed(2));
                                })()} />
                            </div>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">%</span>
                                <ReadOnlyInput value={(() => {
                                    const pmtAmt = parseFloat(stripCommas(formData.paymentAmount)) || 0;
                                    const revNum = parseFloat(stripCommas(formData.grossMonthlyRevenue)) || 0;
                                    if (pmtAmt <= 0 || revNum <= 0) return "";
                                    const monthly = formData.weeklyOrDailyPayment === "true" ? pmtAmt * (52 / 12) : pmtAmt * (260 / 12);
                                    return ((monthly / revNum) * 100).toFixed(2);
                                })()} />
                            </div>
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Existing Monthly Payment + Monthly Payment ($ amount / % of Gross Monthly Revenue)">
                        <label>New Monthly Payment $ / %</label>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">$</span>
                                <ReadOnlyInput value={(() => {
                                    const freqMultiplier = (freq: string) => freq === "Daily" ? 20 : freq === "Bi-Weekly" ? 10 : freq === "Weekly" ? 4 : 1;
                                    const existing = positions.filter(p => p.status).reduce((sum, p) => sum + (p.monthlyPaymentAmount || 0) * freqMultiplier(p.frequency), 0);
                                    const pmtAmt = parseFloat(stripCommas(formData.paymentAmount)) || 0;
                                    const thisDealMonthly = formData.weeklyOrDailyPayment === "true" ? pmtAmt * (52 / 12) : pmtAmt * (260 / 12);
                                    const total = existing + thisDealMonthly;
                                    return total > 0 ? formatDollar(total.toFixed(2)) : "";
                                })()} />
                            </div>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">%</span>
                                <ReadOnlyInput value={(() => {
                                    const freqMultiplier = (freq: string) => freq === "Daily" ? 20 : freq === "Bi-Weekly" ? 10 : freq === "Weekly" ? 4 : 1;
                                    const existing = positions.filter(p => p.status).reduce((sum, p) => sum + (p.monthlyPaymentAmount || 0) * freqMultiplier(p.frequency), 0);
                                    const pmtAmt = parseFloat(stripCommas(formData.paymentAmount)) || 0;
                                    const thisDealMonthly = formData.weeklyOrDailyPayment === "true" ? pmtAmt * (52 / 12) : pmtAmt * (260 / 12);
                                    const total = existing + thisDealMonthly;
                                    const revNum = parseFloat(stripCommas(formData.grossMonthlyRevenue)) || 0;
                                    if (total <= 0 || revNum <= 0) return "";
                                    return ((total / revNum) * 100).toFixed(2);
                                })()} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 1: Deal Details */}
            <div className="form-section">
                <div className="form-section-header">Deal Details</div>
                <div className="form-grid-4">
                    <div className="form-row" title="Select the broker associated with this deal">
                        <label>Broker</label>
                        <ComboBox
                            value={formData.broker}
                            options={brokers.map(b => ({ value: b._id, label: b.brokerName }))}
                            onChange={(v) => setFormData({ ...formData, broker: v })}
                            placeholder="Select broker"
                            maxVisible={8}
                            strictMode
                        />
                    </div>
                    <div className="form-row" title="Date the deal was funded">
                        <label>Funded Date</label>
                        <input type="date" value={formData.fundedDate} onChange={(e) => setFormData({ ...formData, fundedDate: e.target.value })} />
                    </div>
                    <div className="form-row" title="Number of open positions (auto-calculated from positions count + 1)">
                        <label>Position</label>
                        <input type="text" value={positions.length + 1} disabled />
                    </div>
                    <div className="form-row" title="Has this client had a previous Merchant Cash Advance?">
                        <label>MCA History</label>
                        <select value={formData.mcaHistory} onChange={(e) => setFormData({ ...formData, mcaHistory: e.target.value })}>
                            <option value="">-- Select --</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Section 2: Funding */}
            <div className="form-section">
                <div className="form-section-header">Funding</div>
                <div className="form-grid-3">
                    <div className="form-row" title="Total dollar amount funded for this deal">
                        <label>Funded Amount</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.fundedAmount}
                                onFocus={() => setFormData(f => ({ ...f, fundedAmount: stripCommas(f.fundedAmount) }))}
                                onChange={(e) => {
                                    const funded = stripCommas(e.target.value);
                                    const fundedNum = parseFloat(funded);
                                    const feeNum = parseFloat(stripCommas(formData.originationFee));
                                    const net = funded !== "" && formData.originationFee !== "" ? (fundedNum - feeNum).toFixed(2) : funded !== "" ? parseFloat(funded).toFixed(2) : "";
                                    const pct = funded !== "" && formData.originationFee !== "" && fundedNum !== 0 ? ((feeNum / fundedNum) * 100).toFixed(2) : formData.originationFeePercent;
                                    const commission = funded !== "" && formData.brokerFee !== "" ? ((parseFloat(formData.brokerFee) / 100) * fundedNum).toFixed(2) : formData.brokerCommission;
                                    const total = calcTotalPayback(funded, formData.factorRate);
                                    const weekly = formData.weeklyOrDailyPayment === "true";
                                    const payment = calcPayment(total, formData.loanTerm, weekly);
                                    const owed = formData.hasDefaulted ? calcAmountOwed(funded, formData.defaultDate, payment, total, weekly) : "";
                                    setFormData({ ...formData, fundedAmount: funded, netFundedAmount: net, originationFeePercent: pct, brokerCommission: commission, totalPaybackAmount: total, paymentAmount: payment, amountOwedAsOfDefault: owed });
                                }}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, fundedAmount: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Fee charged for originating the deal. Enter as % or $; the other is calculated automatically">
                        <label>Origination Fee</label>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">%</span>
                                <input type="number" step="0.01" placeholder="0.00" value={formData.originationFeePercent}
                                    onChange={(e) => {
                                        const pct = e.target.value; const pctNum = parseFloat(pct); const fundedNum = parseFloat(stripCommas(formData.fundedAmount));
                                        const fee = pct !== "" && formData.fundedAmount !== "" ? ((pctNum / 100) * fundedNum).toFixed(2) : "";
                                        const net = fee !== "" && formData.fundedAmount !== "" ? (fundedNum - parseFloat(fee)).toFixed(2) : formData.fundedAmount !== "" ? parseFloat(stripCommas(formData.fundedAmount)).toFixed(2) : "";
                                        setFormData({ ...formData, originationFeePercent: pct, originationFee: fee, netFundedAmount: net });
                                    }}
                                />
                            </div>
                            <div className="input-prefixed" style={{ flex: 1 }}>
                                <span className="input-prefix-symbol">$</span>
                                <input type="text" inputMode="decimal" placeholder="0.00" value={formData.originationFee}
                                    onFocus={() => setFormData(f => ({ ...f, originationFee: stripCommas(f.originationFee) }))}
                                    onChange={(e) => {
                                        const fee = stripCommas(e.target.value); const feeNum = parseFloat(fee); const fundedNum = parseFloat(stripCommas(formData.fundedAmount));
                                        const pct = fee !== "" && formData.fundedAmount !== "" && fundedNum !== 0 ? ((feeNum / fundedNum) * 100).toFixed(2) : "";
                                        const net = fee !== "" && formData.fundedAmount !== "" ? (fundedNum - feeNum).toFixed(2) : formData.fundedAmount !== "" ? parseFloat(stripCommas(formData.fundedAmount)).toFixed(2) : "";
                                        setFormData({ ...formData, originationFee: fee, originationFeePercent: pct, netFundedAmount: net });
                                    }}
                                    onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, originationFee: formatDollar(v.toFixed(2)) })); }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Funded Amount minus Origination Fee">
                        <label>Net Funded Amount</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={formatDollar(formData.netFundedAmount)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Rates & Terms */}
            <div className="form-section">
                <div className="form-section-header">Rates &amp; Terms</div>
                <div className="form-grid-4">
                    <div className="form-row" title="The base rate charged to the borrower before broker fees">
                        <label>Buy Rate</label>
                        <input type="number" step="0.01" placeholder="0.00" value={formData.buyRate}
                            onChange={(e) => {
                                const buy = e.target.value; const buyNum = parseFloat(buy); const feeNum = parseFloat(formData.brokerFee);
                                const factor = buy !== "" && formData.brokerFee !== "" ? (buyNum + feeNum / 100).toFixed(2) : buy !== "" ? buy : "";
                                const total = calcTotalPayback(formData.fundedAmount, factor);
                                const weekly = formData.weeklyOrDailyPayment === "true";
                                const payment = calcPayment(total, formData.loanTerm, weekly);
                                const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, total, weekly) : "";
                                setFormData({ ...formData, buyRate: buy, factorRate: factor, totalPaybackAmount: total, paymentAmount: payment, amountOwedAsOfDefault: owed });
                            }}
                        />
                    </div>
                    <div className="form-row" title="Broker's fee as a percentage.">
                        <label>Broker Fee</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">%</span>
                            <input type="number" step="0.01" placeholder="0.00" value={formData.brokerFee}
                                onChange={(e) => {
                                    const fee = e.target.value; const feeNum = parseFloat(fee); const buyNum = parseFloat(formData.buyRate);
                                    const factor = fee !== "" && formData.buyRate !== "" ? (buyNum + feeNum / 100).toFixed(2) : formData.buyRate !== "" ? formData.buyRate : "";
                                    const commission = fee !== "" && formData.fundedAmount !== "" ? ((feeNum / 100) * parseFloat(stripCommas(formData.fundedAmount))).toFixed(2) : formData.brokerCommission;
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
                            <ReadOnlyInput value={formatDollar(formData.brokerCommission)} />
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Buy Rate + (Broker Fee / 100)">
                        <label>Factor Rate</label>
                        <ReadOnlyInput value={formData.factorRate} />
                    </div>
                    <div className="form-row" title="How often payments are made: Daily or Weekly">
                        <label>Payment Frequency</label>
                        <select value={formData.weeklyOrDailyPayment}
                            onChange={(e) => {
                                const weekly = e.target.value === "true";
                                const payment = calcPayment(formData.totalPaybackAmount, formData.loanTerm, weekly);
                                const owed = formData.hasDefaulted ? calcAmountOwed(formData.fundedDate, formData.defaultDate, payment, formData.totalPaybackAmount, weekly) : "";
                                setFormData({ ...formData, weeklyOrDailyPayment: e.target.value, paymentAmount: payment, amountOwedAsOfDefault: owed });
                            }}>
                            <option value="false">Daily</option>
                            <option value="true">Weekly</option>
                        </select>
                    </div>
                    <div className="form-row" title="Duration of the loan in calendar days">
                        <label>Loan Term (days)</label>
                        <input type="number" step="1" placeholder="0" value={formData.loanTerm}
                            onChange={(e) => {
                                const term = e.target.value; const weekly = formData.weeklyOrDailyPayment === "true";
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
                            <ReadOnlyInput value={formatDollar(formData.paymentAmount)} />
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Funded Amount x Factor Rate">
                        <label>Total Payback</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={formatDollar(formData.totalPaybackAmount)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 4: Costs & Fees */}
            <div className="form-section">
                <div className="form-section-header">Costs &amp; Fees</div>
                <div className="form-grid-5">
                    <div className="form-row" title="Any additional miscellaneous fees applied to this deal">
                        <label>Miscellaneous Fees</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.miscellaneousFees}
                                onFocus={() => setFormData(f => ({ ...f, miscellaneousFees: stripCommas(f.miscellaneousFees) }))}
                                onChange={(e) => setFormData({ ...formData, miscellaneousFees: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, miscellaneousFees: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Any additional miscellaneous expenses incurred on this deal">
                        <label>Miscellaneous Expenses</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.miscellaneousExpenses}
                                onFocus={() => setFormData(f => ({ ...f, miscellaneousExpenses: stripCommas(f.miscellaneousExpenses) }))}
                                onChange={(e) => setFormData({ ...formData, miscellaneousExpenses: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, miscellaneousExpenses: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Discount amount applied to this deal">
                        <label>Discount</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.discount}
                                onFocus={() => setFormData(f => ({ ...f, discount: stripCommas(f.discount) }))}
                                onChange={(e) => setFormData({ ...formData, discount: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, discount: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    {formData.typeOfDeal !== "renewal" && (
                    <div className="form-row" title="Calculated: Net Funded Amount + Broker Commission + Miscellaneous Expenses">
                        <label>Total Cash Out</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={(() => {
                                const net = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                                const comm = parseFloat(stripCommas(formData.brokerCommission)) || 0;
                                const misc = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                const total = net + comm + misc;
                                return total > 0 ? formatDollar(total.toFixed(2)) : "";
                            })()} />
                        </div>
                    </div>
                    )}
                    <div className="form-row" title="Calculated: Total Payback + Miscellaneous Fees + Miscellaneous Expenses - Discount">
                        <label>Total Payback w/ Fees &amp; Expenses</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={(() => {
                                const payback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                                const fees = parseFloat(stripCommas(formData.miscellaneousFees)) || 0;
                                const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                const disc = parseFloat(stripCommas(formData.discount)) || 0;
                                const total = payback + fees + expenses - disc;
                                return total > 0 ? formatDollar(total.toFixed(2)) : "";
                            })()} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 5: Performance */}
            <div className="form-section">
                <div className="form-section-header">Performance</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0 1rem" }}>
                    <div className="form-row" title="Total amount paid in by the borrower to date">
                        <label>Amount Paid In</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.amountPaidIn}
                                onFocus={() => setFormData(f => ({ ...f, amountPaidIn: stripCommas(f.amountPaidIn) }))}
                                onChange={(e) => setFormData({ ...formData, amountPaidIn: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, amountPaidIn: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: (Amount Paid In / Total Payback) x 100">
                        <label>% Paid In</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">%</span>
                            <ReadOnlyInput value={(() => {
                                const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                                const totalPayback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                                if (totalPayback <= 0) return "";
                                return (paidIn / totalPayback * 100).toFixed(2);
                            })()} />
                        </div>
                    </div>
                    <div className="form-row" title="Amount settled by the renewal deal's rolled balance. Auto-populated when a renewal is created">
                        <label>Settled by Renewal</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={formData.settledByRenewal ? formatDollar(formData.settledByRenewal) : ""} />
                        </div>
                    </div>
                    <div className="form-row" title="Calculated: Total Payback w/ Fees & Expenses - Amount Paid In">
                        <label>Outstanding Amount Owed</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={(() => {
                                const payback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                                const fees = parseFloat(stripCommas(formData.miscellaneousFees)) || 0;
                                const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                const disc = parseFloat(stripCommas(formData.discount)) || 0;
                                const totalWithFees = payback + fees + expenses - disc;
                                const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                                const owed = totalWithFees - paidIn;
                                return totalWithFees > 0 ? formatDollar((owed > 0 ? owed : 0).toFixed(2)) : "";
                            })()} />
                        </div>
                    </div>
                    <div className="form-row" title={formData.typeOfDeal === "renewal"
                        ? "Calculated: Amount Paid In - (Total Net New Cash Out + Broker Commission)"
                        : "Calculated: Amount Paid In - Total Cash Out"}>
                        <label>Net Profit</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <ReadOnlyInput value={(() => {
                                const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                                const net = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                                const comm = parseFloat(stripCommas(formData.brokerCommission)) || 0;
                                const misc = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                const rolled = parseFloat(stripCommas(formData.rolledBalance)) || 0;
                                const isRenewal = formData.typeOfDeal === "renewal";
                                const costBasis = isRenewal
                                    ? (net - rolled) + comm
                                    : net + comm + misc;
                                if (paidIn <= 0 && costBasis <= 0) return "";
                                return formatDollar((paidIn - costBasis).toFixed(2));
                            })()} />
                        </div>
                    </div>
                    {formData.typeOfDeal !== "renewal" && (
                    <div className="form-row" title="Calculated: (Amount Paid In - Total Cash Out) / Total Cash Out x 100. Only shown for new deals; renewals use the Compound Performance metrics below.">
                        <label>Current ROI</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">%</span>
                            <ReadOnlyInput value={(() => {
                                const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                                const netFunded = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                                const comm = parseFloat(stripCommas(formData.brokerCommission)) || 0;
                                const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                const totalCashOut = netFunded + comm + expenses;
                                if (totalCashOut <= 0) return "";
                                return ((paidIn - totalCashOut) / totalCashOut * 100).toFixed(2);
                            })()} />
                        </div>
                    </div>
                    )}
                </div>
            </div>

            {/* Section 6: Default */}
            <div className="form-section">
                <div className="form-section-header">Default</div>
                <div className="form-grid-3">
                    <div className="form-row" title="Check to mark as defaulted. Date and days since funded are linked; changing one updates the other">
                        <label>Default Date / Days</label>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <input type="checkbox" style={{ width: "auto", flexShrink: 0 }} checked={formData.hasDefaulted}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    const today = new Date().toISOString().split("T")[0];
                                    const dateVal = checked ? today : formData.defaultDate;
                                    let days = "";
                                    if (checked && dateVal && formData.fundedDate) {
                                        const diff = parseDateUTC(dateVal) - parseDateUTC(formData.fundedDate);
                                        days = Math.floor(diff / 86400000).toString();
                                    }
                                    let owedDefault = formData.amountOwedAsOfDefault;
                                    if (checked) {
                                        const currentOwed = parseFloat(stripCommas(formData.amountOwedAsOfDefault)) || 0;
                                        if (!formData.amountOwedAsOfDefault || currentOwed === 0) {
                                            const payback = parseFloat(stripCommas(formData.totalPaybackAmount)) || 0;
                                            const fees = parseFloat(stripCommas(formData.miscellaneousFees)) || 0;
                                            const expenses = parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0;
                                            const disc = parseFloat(stripCommas(formData.discount)) || 0;
                                            const totalWithFees = payback + fees + expenses - disc;
                                            const paidIn = parseFloat(stripCommas(formData.amountPaidIn)) || 0;
                                            const outstanding = totalWithFees - paidIn;
                                            owedDefault = outstanding > 0 ? formatDollar(outstanding.toFixed(2)) : "";
                                        }
                                    }
                                    setFormData({ ...formData, hasDefaulted: checked, defaultDate: dateVal, defaultDays: days, amountOwedAsOfDefault: owedDefault });
                                }}
                            />
                            <input type="date" style={{ flex: 2 }} value={formData.defaultDate} disabled={!formData.hasDefaulted}
                                onChange={(e) => {
                                    const dateVal = e.target.value; let days = "";
                                    if (dateVal && formData.fundedDate) { const diff = parseDateUTC(dateVal) - parseDateUTC(formData.fundedDate); days = Math.floor(diff / 86400000).toString(); }
                                    setFormData({ ...formData, defaultDate: dateVal, defaultDays: days });
                                }}
                            />
                            <input type="number" style={{ flex: 1, minWidth: 0 }} placeholder="Days" value={formData.defaultDays} disabled={!formData.hasDefaulted}
                                onChange={(e) => {
                                    const daysVal = e.target.value; let dateStr = "";
                                    if (daysVal !== "" && formData.fundedDate) { const ms = parseDateUTC(formData.fundedDate) + parseInt(daysVal) * 86400000; dateStr = new Date(ms).toISOString().split("T")[0]; }
                                    setFormData({ ...formData, defaultDays: daysVal, defaultDate: dateStr });
                                }}
                            />
                        </div>
                    </div>
                    <div className="form-row" title="Amount owed at time of default. Auto-populated from Outstanding Amount Owed when default is checked (if empty or zero)">
                        <label>Amount Owed as of Default</label>
                        <div className="input-prefixed">
                            <span className="input-prefix-symbol">$</span>
                            <input type="text" inputMode="decimal" placeholder="0.00" value={formData.amountOwedAsOfDefault}
                                disabled={!formData.hasDefaulted}
                                onFocus={() => setFormData(f => ({ ...f, amountOwedAsOfDefault: stripCommas(f.amountOwedAsOfDefault) }))}
                                onChange={(e) => setFormData({ ...formData, amountOwedAsOfDefault: stripCommas(e.target.value) })}
                                onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, amountOwedAsOfDefault: formatDollar(v.toFixed(2)) })); }}
                            />
                        </div>
                    </div>
                    <div />
                </div>
            </div>

            {/* Section 7: Renewal (only shown for renewals) */}
            {formData.typeOfDeal === "renewal" && (
            <div className="form-section">
                <div className="form-section-header">Renewal</div>
                <div className="form-grid-3">
                            <div className="form-row" title="Balance rolled over from the previous deal into this renewal">
                                <label>Rolled Balance</label>
                                <div className="input-prefixed">
                                    <span className="input-prefix-symbol">$</span>
                                    <input type="text" inputMode="decimal" placeholder="0.00" value={formData.rolledBalance}
                                        onFocus={() => setFormData(f => ({ ...f, rolledBalance: stripCommas(f.rolledBalance) }))}
                                        onChange={(e) => setFormData({ ...formData, rolledBalance: stripCommas(e.target.value) })}
                                        onBlur={(e) => { const v = parseFloat(stripCommas(e.target.value)); if (!isNaN(v)) setFormData((f) => ({ ...f, rolledBalance: formatDollar(v.toFixed(2)) })); }}
                                    />
                                </div>
                            </div>
                            <div className="form-row" title="Calculated: Net Funded Amount - Rolled Balance. The actual new cash disbursed to the client">
                                <label>Net New Cash Out to Client</label>
                                <div className="input-prefixed">
                                    <span className="input-prefix-symbol">$</span>
                                    <ReadOnlyInput value={(() => {
                                        const netFunded = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                                        const rolled = parseFloat(stripCommas(formData.rolledBalance)) || 0;
                                        const netNew = netFunded - rolled;
                                        return netFunded > 0 ? formatDollar((netNew > 0 ? netNew : 0).toFixed(2)) : "";
                                    })()} />
                                </div>
                            </div>
                            <div className="form-row" title="Calculated: Net New Cash Out + Broker Commission">
                                <label>Total Net New Cash Out + Broker Commission</label>
                                <div className="input-prefixed">
                                    <span className="input-prefix-symbol">$</span>
                                    <ReadOnlyInput value={(() => {
                                        const netFunded = parseFloat(stripCommas(formData.netFundedAmount)) || 0;
                                        const rolled = parseFloat(stripCommas(formData.rolledBalance)) || 0;
                                        const netNew = netFunded - rolled;
                                        const comm = parseFloat(stripCommas(formData.brokerCommission)) || 0;
                                        const total = (netNew > 0 ? netNew : 0) + comm;
                                        return total > 0 ? formatDollar(total.toFixed(2)) : "";
                                    })()} />
                                </div>
                            </div>
                </div>
            </div>
            )}

            {/* Section 8: Compound Performance (shown when deal is part of a renewal chain or adding a renewal) */}
            {(() => {
                // Determine if we should show this section
                const isPartOfChain = editingDeal && (editingDeal.parentDealId || editingDeal.renewalDealId);
                const isNewRenewal = isAdding && renewingParentId;
                if (!isPartOfChain && !isNewRenewal) return null;

                // Build a virtual deal from formData for real-time updates
                const currentDealFromForm: DealRecord = {
                    _id: editingDeal?._id ?? "current",
                    entityId: editingDeal?.entityId ?? "(new)",
                    officeAcronym: "",
                    broker: null,
                    typeOfDeal: formData.typeOfDeal,
                    position: formData.position,
                    fundedDate: formData.fundedDate,
                    defaultDate: formData.defaultDate,
                    defaultDays: parseInt(formData.defaultDays) || 0,
                    fundedAmount: parseFloat(stripCommas(formData.fundedAmount)) || 0,
                    netFundedAmount: parseFloat(stripCommas(formData.netFundedAmount)) || 0,
                    originationFee: parseFloat(stripCommas(formData.originationFee)) || 0,
                    originationFeePercent: parseFloat(formData.originationFeePercent) || 0,
                    loanTerm: parseInt(formData.loanTerm) || 0,
                    weeklyOrDailyPayment: formData.weeklyOrDailyPayment === "true",
                    paymentAmount: parseFloat(stripCommas(formData.paymentAmount)) || 0,
                    buyRate: parseFloat(formData.buyRate) || 0,
                    factorRate: parseFloat(formData.factorRate) || 0,
                    mcaHistory: formData.mcaHistory,
                    brokerFee: parseFloat(formData.brokerFee) || 0,
                    brokerCommission: parseFloat(stripCommas(formData.brokerCommission)) || 0,
                    totalPaybackAmount: parseFloat(stripCommas(formData.totalPaybackAmount)) || 0,
                    hasDefaulted: formData.hasDefaulted,
                    amountOwedAsOfDefault: parseFloat(stripCommas(formData.amountOwedAsOfDefault)) || 0,
                    miscellaneousFees: parseFloat(stripCommas(formData.miscellaneousFees)) || 0,
                    miscellaneousExpenses: parseFloat(stripCommas(formData.miscellaneousExpenses)) || 0,
                    discount: parseFloat(stripCommas(formData.discount)) || 0,
                    amountPaidIn: parseFloat(stripCommas(formData.amountPaidIn)) || 0,
                    settledByRenewal: parseFloat(stripCommas(formData.settledByRenewal)) || 0,
                    totalCashOut: 0, totalPaybackWithFeesAndExpenses: 0, netProfit: 0,
                    rolledBalance: parseFloat(stripCommas(formData.rolledBalance)) || 0,
                    netNewCashOut: parseFloat(stripCommas(formData.netNewCashOut)) || 0,
                    roi: parseFloat(formData.roi) || 0, currentRoi: parseFloat(formData.currentRoi) || 0,
                    grossMonthlyRevenue: parseFloat(stripCommas(formData.grossMonthlyRevenue)) || 0,
                    existingMonthlyPayment: 0, existingMonthlyPaymentPercent: 0,
                    monthlyPayment: 0, monthlyPaymentPercent: 0,
                    newMonthlyPayment: 0, newMonthlyPaymentPercent: 0,
                    compoundTotalFunded: 0, compoundTotalPayback: 0, compoundTotalCollected: 0,
                    compoundNetNewCapital: 0, compoundExpectedProfit: 0, compoundCurrentProfit: 0,
                    compoundExpectedRoi: 0, compoundExpectedRoiOnCapital: 0,
                    compoundCurrentRoi: 0, compoundCurrentRoiOnCapital: 0,
                    totalNetCashOut: 0,
                    positions: [], dealState: "",
                    renewalDate: formData.renewalDate || "",
                    renewalDealId: editingDeal?.renewalDealId ?? null,
                    parentDealId: editingDeal?.parentDealId ?? renewingParentId,
                } as DealRecord;

                // Derive state for the virtual deal using the same rules as the server
                const virtualTotalPayback = (currentDealFromForm.fundedAmount || 0) * (currentDealFromForm.factorRate || 0);
                const virtualTotalReceived = (currentDealFromForm.amountPaidIn || 0) + (currentDealFromForm.settledByRenewal || 0);
                if (currentDealFromForm.hasDefaulted) {
                    currentDealFromForm.dealState = "default";
                } else if (currentDealFromForm.renewalDealId) {
                    currentDealFromForm.dealState = "renewed";
                } else if (!currentDealFromForm.fundedDate) {
                    currentDealFromForm.dealState = "dormant";
                } else if (new Date(currentDealFromForm.fundedDate) > new Date()) {
                    currentDealFromForm.dealState = "dormant";
                } else if (virtualTotalPayback > 0 && virtualTotalReceived >= virtualTotalPayback) {
                    currentDealFromForm.dealState = "completed";
                } else {
                    currentDealFromForm.dealState = "active";
                }

                // Build chain: walk up to root from parent, then append current
                let chain: DealRecord[] = [];
                const parentId = editingDeal?.parentDealId ?? renewingParentId;
                if (parentId) {
                    // Find root by walking up
                    let root = deals.find(d => d._id === parentId);
                    if (root) {
                        const ancestors: DealRecord[] = [root];
                        while (root.parentDealId) {
                            const p = deals.find(d => d._id === root!.parentDealId);
                            if (!p) break;
                            ancestors.unshift(p);
                            root = p;
                        }
                        chain = [...ancestors];
                    }
                } else if (editingDeal) {
                    // This is the root deal — start chain with saved deals before it
                    chain = [];
                }

                // For editing, replace the current deal in the chain with the live formData version
                if (editingDeal) {
                    chain = chain.filter(d => d._id !== editingDeal._id);
                    // Also add any renewals after the current deal
                    let nextId = editingDeal.renewalDealId;
                    const after: DealRecord[] = [];
                    while (nextId) {
                        const next = deals.find(d => d._id === nextId);
                        if (!next) break;
                        after.push(next);
                        nextId = next.renewalDealId;
                    }
                    // Insert current deal at the right position
                    chain.push(currentDealFromForm);
                    chain.push(...after);
                } else {
                    // Adding new renewal — append virtual deal
                    chain.push(currentDealFromForm);
                }

                if (chain.length < 2) return null;

                const compoundTotalFunded = chain.reduce((s, d) => s + (d.fundedAmount || 0), 0);
                const compoundTotalPayback = chain.reduce((s, d) => s + calcDealTotalPaybackWithFees(d), 0);
                const compoundTotalPaidIn = chain.reduce((s, d) => s + (d.amountPaidIn || 0), 0);
                const compoundTotalCollected = compoundTotalPaidIn;
                const compoundNetNewCapital = chain.reduce((s, d) => s + calcDealNetNewCapital(d), 0);
                const compoundTotalNetNewCashOut = chain.reduce((s, d) => s + calcDealTotalNetNewCashOut(d), 0);
                const compoundCurrentProfit = compoundTotalCollected - compoundTotalNetNewCashOut;
                const compoundCurrentRoi = compoundTotalNetNewCashOut > 0 ? (compoundCurrentProfit / compoundTotalNetNewCashOut * 100) : 0;
                const compoundCurrentRoiOnCapital = compoundNetNewCapital > 0 ? (compoundCurrentProfit / compoundNetNewCapital * 100) : 0;

                const currentId = editingDeal?._id ?? "current";

                return (
                    <div className="form-section">
                        <div className="form-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Compound Performance ({chain.length} Deals in Chain)</span>
                            <button className="btn btn-sm" onClick={() => setShowCompoundInfo(true)} style={{ textTransform: "none", letterSpacing: "normal", fontSize: "0.75rem" }}>Info</button>
                        </div>
                        <table className="ledger-table">
                            <thead>
                                <tr>
                                    <th>Deal</th>
                                    <th>Type</th>
                                    <th>Funded</th>
                                    <th>Net<br/>Funded</th>
                                    <th>Rolled<br/>Balance</th>
                                    <th>Net Funded +<br/>Broker Commission</th>
                                    <th>Broker<br/>Commission</th>
                                    <th>Total<br/>Payback</th>
                                    <th>Paid In</th>
                                    <th>%<br/>Paid In</th>
                                    <th>Rolled<br/>Over</th>
                                    <th>Outstanding</th>
                                    <th>Profit</th>
                                    <th>Current<br/>ROI</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chain.map((d) => {
                                    const totalPB = calcDealTotalPaybackWithFees(d);
                                    const netNew = calcDealNetNewCapital(d);
                                    const paidIn = d.amountPaidIn || 0;
                                    const settled = d.settledByRenewal || 0;
                                    const outstanding = totalPB - paidIn;
                                    const totalMoneyOut = calcDealTotalMoneyOut(d);
                                    const profit = paidIn - totalMoneyOut;
                                    const isCurrent = d._id === currentId;
                                    return (
                                        <tr key={d._id} className={isCurrent ? "ledger-current" : ""}>
                                            <td style={{ textAlign: "left" }}>{d.entityId ?? "-"}</td>
                                            <td style={{ textTransform: "capitalize" }}>{d.typeOfDeal ?? "-"}</td>
                                            <td>{formatCurrency(d.fundedAmount)}</td>
                                            <td>{formatCurrency(d.typeOfDeal === "renewal"
                                                ? (d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0))) - (d.rolledBalance || 0)
                                                : (d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0))))}</td>
                                            <td>{d.rolledBalance ? formatCurrency(d.rolledBalance) : "-"}</td>
                                            <td>{formatCurrency(netNew)}</td>
                                            <td>{formatCurrency(d.brokerCommission || 0)}</td>
                                            <td>{formatCurrency(totalPB)}</td>
                                            <td>{formatCurrency(paidIn)}</td>
                                            <td style={{ textAlign: "center" }}>{totalPB > 0 ? (paidIn / totalPB * 100).toFixed(2) + "%" : "-"}</td>
                                            <td>{settled ? formatCurrency(settled) : "-"}</td>
                                            <td style={{ color: outstanding > 0 ? "#c62828" : undefined }}>{formatCurrency(outstanding > 0 ? outstanding : 0)}</td>
                                            <td style={{ color: profit >= 0 ? "#2e7d32" : "#c62828" }}>{formatCurrency(profit)}</td>
                                            {(() => {
                                                const isRenewal = d.typeOfDeal === "renewal";
                                                const netFunded = d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0));
                                                const comm = d.brokerCommission || 0;
                                                const expenses = d.miscellaneousExpenses || 0;
                                                const costBasis = isRenewal
                                                    ? (netFunded - (d.rolledBalance || 0)) + comm + expenses
                                                    : netFunded + comm + expenses;
                                                const roi = costBasis > 0 ? ((paidIn - costBasis) / costBasis * 100) : 0;
                                                return <td style={{ textAlign: "center", color: roi < 0 ? "#c62828" : roi > 0 ? "#2e7d32" : undefined }}>{roi !== 0 ? roi.toFixed(2) + "%" : "-"}</td>;
                                            })()}
                                            <td style={{ textTransform: "capitalize" }}>{d.dealState ?? "-"}</td>
                                        </tr>
                                    );
                                })}
                                {(() => {
                                    const totalLedgerProfit = chain.reduce((s, d) => s + ((d.amountPaidIn || 0) - calcDealTotalMoneyOut(d)), 0);
                                    const totalRolledBalance = chain.reduce((s, d) => s + (d.rolledBalance || 0), 0);
                                    const totalSettled = chain.reduce((s, d) => s + (d.settledByRenewal || 0), 0);
                                    const totalOutstanding = chain.reduce((s, d) => {
                                        const owed = calcDealTotalPaybackWithFees(d) - (d.amountPaidIn || 0);
                                        return s + (owed > 0 ? owed : 0);
                                    }, 0);
                                    return (
                                        <>
                                        <tr className="ledger-totals">
                                            <td style={{ textAlign: "left" }}>Totals (per deal)</td>
                                            <td></td>
                                            <td>{formatCurrency(compoundTotalFunded)}</td>
                                            <td>{formatCurrency(chain.reduce((s, d) => {
                                                const nf = d.netFundedAmount || ((d.fundedAmount || 0) - (d.originationFee || 0));
                                                return s + (d.typeOfDeal === "renewal" ? nf - (d.rolledBalance || 0) : nf);
                                            }, 0))}</td>
                                            <td>{formatCurrency(totalRolledBalance)}</td>
                                            <td>{formatCurrency(compoundNetNewCapital)}</td>
                                            <td>{formatCurrency(chain.reduce((s, d) => s + (d.brokerCommission || 0), 0))}</td>
                                            <td>{formatCurrency(compoundTotalPayback)}</td>
                                            <td>{formatCurrency(compoundTotalPaidIn)}</td>
                                            <td style={{ textAlign: "center" }}>{compoundTotalPayback > 0 ? (compoundTotalPaidIn / compoundTotalPayback * 100).toFixed(2) + "%" : "-"}</td>
                                            <td>{formatCurrency(totalSettled)}</td>
                                            <td style={{ color: totalOutstanding > 0 ? "#c62828" : undefined }}>{formatCurrency(totalOutstanding)}</td>
                                            <td style={{ color: totalLedgerProfit >= 0 ? "#2e7d32" : "#c62828" }}>{formatCurrency(totalLedgerProfit)}</td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                        <div className="compound-metrics" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                            <div className="compound-metric-card">
                                <div className="metric-label">Current ROI (on Cash Out)</div>
                                <div className={`metric-value ${compoundCurrentRoi >= 0 ? "positive" : "negative"}`}>{compoundCurrentRoi.toFixed(2)}%</div>
                            </div>
                            <div className="compound-metric-card">
                                <div className="metric-label">Current ROI (on Net Capital)</div>
                                <div className={`metric-value ${compoundCurrentRoiOnCapital >= 0 ? "positive" : "negative"}`}>{compoundCurrentRoiOnCapital.toFixed(2)}%</div>
                            </div>
                            <div className="compound-metric-card">
                                <div className="metric-label">Current Compound Profit</div>
                                <div className={`metric-value ${compoundCurrentProfit >= 0 ? "positive" : "negative"}`}>{formatCurrency(compoundCurrentProfit)}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Section 9: Open Positions */}
            <div className="form-section">
                <div className="form-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Open Positions</span>
                    <button className="btn btn-sm" onClick={() => setIsAddingPosition(true)} disabled={isAddingPosition} style={{ textTransform: "none", letterSpacing: "normal", fontSize: "0.75rem" }}>Add Position</button>
                </div>
                    <table className="dialog-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "center" }}>Position</th>
                                <th style={{ textAlign: "center" }}>Frequency</th>
                                <th>Funder</th>
                                <th style={{ textAlign: "right" }}>Payment Amount</th>
                                <th style={{ textAlign: "center" }}>Funded Date</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((pos) => (
                                editingPositionId === pos._id ? (
                                    <tr key={pos._id} className="position-row">
                                        <td style={{ textAlign: "center" }}>{pos.position}</td>
                                        <td><select value={positionForm.frequency} onChange={(e) => setPositionForm({ ...positionForm, frequency: e.target.value })} style={{ width: "100%" }}><option value="">-- Select --</option><option value="Daily">Daily</option><option value="Bi-Weekly">Bi-Weekly</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select></td>
                                        <td><ComboBox value={positionForm.funder} options={funders.map(f => f.funderName)} onChange={(v) => setPositionForm({ ...positionForm, funder: v })} placeholder="Type to search or add" style={{ width: "100%" }} /></td>
                                        <td><input type="number" step="0.01" placeholder="0.00" value={positionForm.monthlyPaymentAmount} onChange={(e) => setPositionForm({ ...positionForm, monthlyPaymentAmount: e.target.value })} style={{ width: "100%" }} /></td>
                                        <td><input type="date" value={positionForm.fundedDate} onChange={(e) => setPositionForm({ ...positionForm, fundedDate: e.target.value })} style={{ width: "100%" }} /></td>
                                        <td style={{ textAlign: "center" }}>
                                            <select value={positionForm.status ? "true" : "false"} onChange={(e) => setPositionForm({ ...positionForm, status: e.target.value === "true" })}>
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </td>
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-primary" onClick={handleSavePosition}>Save</button>
                                            <button className="btn btn-sm" onClick={() => { setEditingPositionId(null); setPositionForm({ frequency: "", funder: "", monthlyPaymentAmount: "", fundedDate: "", status: true }); }}>Cancel</button>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={pos._id} className="position-row">
                                        <td style={{ textAlign: "center" }}>{pos.position}</td>
                                        <td style={{ textAlign: "center" }}>{pos.frequency || "-"}</td>
                                        <td>{pos.funder || "-"}</td>
                                        <td style={{ textAlign: "right" }}>{pos.monthlyPaymentAmount != null ? formatCurrency(pos.monthlyPaymentAmount) : "-"}</td>
                                        <td style={{ textAlign: "center" }}>{formatDate(pos.fundedDate)}</td>
                                        <td style={{ textAlign: "center" }}>{pos.status ? "Active" : "Inactive"}</td>
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-success" onClick={() => startEditPosition(pos)} disabled={isAddingPosition || editingPositionId !== null}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDeletePosition(pos._id)} disabled={isAddingPosition || editingPositionId !== null}>Delete</button>
                                        </td>
                                    </tr>
                                )
                            ))}
                            {positions.length === 0 && !isAddingPosition && (
                                <tr><td colSpan={7} className="empty-row">No positions</td></tr>
                            )}
                            {isAddingPosition && (
                                <tr>
                                    <td style={{ textAlign: "center" }}>{positions.length + 1}</td>
                                    <td><select value={positionForm.frequency} onChange={(e) => setPositionForm({ ...positionForm, frequency: e.target.value })} style={{ width: "100%" }}><option value="">-- Select --</option><option value="Daily">Daily</option><option value="Bi-Weekly">Bi-Weekly</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select></td>
                                    <td><ComboBox value={positionForm.funder} options={funders.map(f => f.funderName)} onChange={(v) => setPositionForm({ ...positionForm, funder: v })} placeholder="Type to search or add" style={{ width: "100%" }} /></td>
                                    <td><input type="number" step="0.01" placeholder="0.00" value={positionForm.monthlyPaymentAmount} onChange={(e) => setPositionForm({ ...positionForm, monthlyPaymentAmount: e.target.value })} style={{ width: "100%" }} /></td>
                                    <td><input type="date" value={positionForm.fundedDate} onChange={(e) => setPositionForm({ ...positionForm, fundedDate: e.target.value })} style={{ width: "100%" }} /></td>
                                    <td style={{ textAlign: "center" }}>
                                        <select value={positionForm.status ? "true" : "false"} onChange={(e) => setPositionForm({ ...positionForm, status: e.target.value === "true" })}>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </td>
                                    <td className="action-cell">
                                        <button className="btn btn-sm btn-primary" onClick={handleAddPosition}>Save</button>
                                        <button className="btn btn-sm" onClick={() => { setIsAddingPosition(false); setPositionForm({ frequency: "", funder: "", monthlyPaymentAmount: "", fundedDate: "", status: true }); }}>Cancel</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                            <option value="">-- Select Funded Client --</option>
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
                                    <th style={{ textAlign: "center" }}>ID</th>
                                    <th style={{ textAlign: "center" }}>Broker</th>
                                    <th style={{ textAlign: "center" }}>Type</th>
                                    <th style={{ textAlign: "center" }}>State</th>
                                    <th style={{ textAlign: "center" }}>Funded<br/>Date</th>
                                    <th style={{ textAlign: "center" }}>Funded<br/>Amount</th>
                                    <th style={{ textAlign: "center" }}>Net<br/>Funded</th>
                                    <th style={{ textAlign: "center" }}>Term<br/>(days)</th>
                                    <th style={{ textAlign: "center" }}>Factor<br/>Rate</th>
                                    <th style={{ textAlign: "center" }}>Total<br/>Payback</th>
                                    <th style={{ textAlign: "center" }}>Rx'd to<br/>Date</th>
                                    <th style={{ textAlign: "center" }}>Outstanding</th>
                                    <th style={{ textAlign: "center" }}>Current<br/>ROI</th>
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
                                        <td style={{ textAlign: "right" }}>{formatCurrency(deal.amountPaidIn)}</td>
                                        {(() => {
                                            const payback = (deal.fundedAmount || 0) * (deal.factorRate || 0) + (deal.miscellaneousFees || 0) + (deal.miscellaneousExpenses || 0) - (deal.discount || 0);
                                            const outstanding = payback - (deal.amountPaidIn || 0);
                                            const val = outstanding > 0 ? outstanding : 0;
                                            return <td style={{ textAlign: "right", color: val > 0 ? "#c62828" : undefined }}>{formatCurrency(val)}</td>;
                                        })()}
                                        {(() => {
                                            const netFunded = deal.netFundedAmount || ((deal.fundedAmount || 0) - (deal.originationFee || 0));
                                            const comm = deal.brokerCommission || ((deal.brokerFee || 0) / 100 * (deal.fundedAmount || 0));
                                            const expenses = deal.miscellaneousExpenses || 0;
                                            const isRenewal = deal.typeOfDeal === "renewal";
                                            const rolledBalance = deal.rolledBalance || 0;
                                            const costBasis = isRenewal
                                                ? (netFunded - rolledBalance) + comm + expenses
                                                : netFunded + comm + expenses;
                                            const paidIn = deal.amountPaidIn || 0;
                                            const currentRoi = costBasis > 0 ? ((paidIn - costBasis) / costBasis * 100) : 0;
                                            const tooltip = isRenewal
                                                ? "ROI based on Total Net New Cash Out (Net New Cash Out + Broker Commission + Misc Expenses)"
                                                : "ROI based on Total Cash Out (Net Funded + Broker Commission + Misc Expenses)";
                                            return (
                                                    <td style={{ textAlign: "center", color: currentRoi < 0 ? "#c62828" : undefined }} title={tooltip}>{currentRoi !== 0 ? currentRoi.toFixed(2) + "%" : "-"}</td>
                                            );
                                        })()}
                                        <td className="action-cell">
                                            <button className="btn btn-sm btn-success" onClick={() => startEdit(deal)} disabled={isAdding || showForm}>Edit</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(deal)} disabled={isAdding || showForm || !!deal.renewalDealId}>Delete</button>
                                            <button className="btn btn-sm" onClick={() => handleRenew(deal)} disabled={isAdding || showForm || !!deal.renewalDealId}>Renew</button>
                                        </td>
                                    </tr>
                                ))}
                                {deals.length === 0 && (
                                    <tr><td colSpan={14} className="empty-row">No deals found for this corporation</td></tr>
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

        {showCompoundInfo && (
            <div className="dialog-overlay" style={{ zIndex: 2002 }}>
                <div className="dialog dialog-wide">
                    <div className="dialog-header">
                        <h2>Compound Performance — How It Works</h2>
                        <button className="dialog-close" onClick={() => setShowCompoundInfo(false)}>&times;</button>
                    </div>
                    <div className="dialog-body" style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
                        <h3 style={{ color: "#2c3e50", marginBottom: "0.5rem" }}>Overview</h3>
                        <p>The compound performance section aggregates financial data across the entire renewal chain. Each deal shows its <strong>actual state</strong> — what the client paid vs what was funded — without artificially settling amounts via renewals.</p>

                        <h3 style={{ color: "#2c3e50", marginTop: "1rem", marginBottom: "0.5rem" }}>The Ledger Table</h3>
                        <p>Each row shows one deal in the chain:</p>
                        <ul style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
                            <li><strong>Funded</strong> — Total amount funded for that deal</li>
                            <li><strong>Rolled Balance</strong> — Amount from the renewal used to cover the previous deal's outstanding balance</li>
                            <li><strong>Net New Capital</strong> — For the original deal: full Funded Amount. For renewals: Funded − Rolled Balance</li>
                            <li><strong>Total Payback</strong> — (Funded × Factor Rate) + Misc Fees + Misc Expenses − Discount</li>
                            <li><strong>Paid In</strong> — Actual client payments received on this deal only</li>
                            <li><strong>Rolled Over</strong> — The amount that was rolled over when this deal was renewed (Settled by Renewal value)</li>
                            <li><strong>Outstanding</strong> — Total Payback − Paid In (what the client still owes on this deal)</li>
                            <li><strong>Profit</strong> — Paid In − Funded Amount (actual per-deal profit/loss based on client payments only)</li>
                        </ul>

                        <h3 style={{ color: "#2c3e50", marginTop: "1rem", marginBottom: "0.5rem" }}>Understanding Per-Deal Loss and Capital Recovery</h3>
                        <p>When a deal is renewed before the client has paid back the full funded amount, the per-deal profit will show a <strong style={{ color: "#c62828" }}>loss</strong>. This is correct — it reflects that the client did not fully repay that deal.</p>
                        <p style={{ marginTop: "0.5rem" }}>However, this loss is <strong>recovered through capital recycling</strong>. The rolled balance from the renewal means the next deal requires less new capital. The ledger shows:</p>
                        <ul style={{ marginLeft: "1.5rem" }}>
                            <li><strong>Totals (per deal)</strong> — Sum of individual deal profits. May show a loss because each deal's profit is measured against its full Funded Amount.</li>
                            <li><strong>Capital recovered via renewals</strong> — The total rolled balance across all renewals. This capital was recycled, not lost. It reduces the actual new money deployed.</li>
                            <li><strong>Adjusted Compound Profit</strong> — Totals Profit + Capital Recovered. This bridges the gap to show the true economic outcome.</li>
                        </ul>

                        <h3 style={{ color: "#2c3e50", marginTop: "1rem", marginBottom: "0.5rem" }}>Compound Metrics</h3>
                        <p>These use Total Net New Cash Out (actual cash disbursed) as the cost basis.</p>

                        <p style={{ marginTop: "0.5rem" }}><strong>Total Net New Cash Out</strong> (per deal) = Net New Cash Out + Broker Commission</p>
                        <p style={{ marginLeft: "1rem", fontSize: "0.82rem", color: "#777" }}>For the original deal, Net New Cash Out = Net Funded Amount. For renewals: Net Funded − Rolled Balance.</p>

                        <p style={{ marginTop: "0.5rem" }}><strong>Expected ROI (on Cash Out)</strong></p>
                        <p style={{ marginLeft: "1rem", color: "#555" }}>= (Total Expected Payback − Total Net New Cash Out) / Total Net New Cash Out × 100</p>

                        <p style={{ marginTop: "0.5rem" }}><strong>Expected ROI (on Net Capital)</strong></p>
                        <p style={{ marginLeft: "1rem", color: "#555" }}>= (Total Expected Payback − Total Net New Cash Out) / Total Net New Capital × 100</p>

                        <p style={{ marginTop: "0.5rem" }}><strong>Current ROI (on Cash Out / Net Capital)</strong></p>
                        <p style={{ marginLeft: "1rem", color: "#555" }}>Same formulas but using actual Total Paid In (client payments only, no settled amounts) instead of expected payback.</p>

                        <p style={{ marginTop: "0.5rem" }}><strong>Expected / Current Compound Profit</strong></p>
                        <p style={{ marginLeft: "1rem", color: "#555" }}>= Total Payback (or Total Paid In) − Total Net New Cash Out</p>

                        <h3 style={{ color: "#2c3e50", marginTop: "1rem", marginBottom: "0.5rem" }}>Example</h3>
                        <p>Deal 1: Fund $10,000, Origination Fee 5% ($500), Net Funded $9,500, Broker Commission $1,000, Factor Rate 1.35.</p>
                        <p>Total Payback = $13,500. Total Net New Cash Out = $9,500 + $1,000 = $10,500.</p>
                        <p>Client pays $5,000 then deal is renewed. Outstanding = $8,500.</p>

                        <p style={{ marginTop: "0.5rem" }}>Deal 2 (renewal): Fund $10,000, same terms. Rolled Balance = $8,500.</p>
                        <p>Net New Cash Out = $9,500 − $8,500 = $1,000. Total Net New Cash Out = $1,000 + $1,000 = $2,000.</p>
                        <p>Client pays full $13,500.</p>

                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem", fontSize: "0.82rem" }}>
                            <thead><tr style={{ borderBottom: "2px solid #3d5470" }}>
                                <th style={{ textAlign: "left", padding: "0.3rem" }}>Deal</th><th style={{ textAlign: "right", padding: "0.3rem" }}>Funded</th><th style={{ textAlign: "right", padding: "0.3rem" }}>Paid In</th><th style={{ textAlign: "right", padding: "0.3rem" }}>Per-Deal Profit</th>
                            </tr></thead>
                            <tbody>
                                <tr><td style={{ padding: "0.3rem" }}>Deal 1</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$10,000</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$5,000</td><td style={{ textAlign: "right", padding: "0.3rem", color: "#c62828" }}>-$5,000</td></tr>
                                <tr><td style={{ padding: "0.3rem" }}>Deal 2</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$10,000</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$13,500</td><td style={{ textAlign: "right", padding: "0.3rem", color: "#2e7d32" }}>$3,500</td></tr>
                                <tr style={{ borderTop: "2px solid #3d5470", fontWeight: 700 }}><td style={{ padding: "0.3rem" }}>Totals</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$20,000</td><td style={{ textAlign: "right", padding: "0.3rem" }}>$18,500</td><td style={{ textAlign: "right", padding: "0.3rem", color: "#c62828" }}>-$1,500</td></tr>
                                <tr style={{ color: "#2e7d32" }}><td colSpan={3} style={{ padding: "0.3rem" }}>Capital recovered via renewal</td><td style={{ textAlign: "right", padding: "0.3rem" }}>+$8,500</td></tr>
                                <tr style={{ fontWeight: 700, background: "#e3edf7" }}><td colSpan={3} style={{ padding: "0.3rem" }}>Adjusted Compound Profit</td><td style={{ textAlign: "right", padding: "0.3rem", color: "#2e7d32" }}>$7,000</td></tr>
                            </tbody>
                        </table>

                        <p style={{ marginTop: "0.75rem" }}>Per-deal, we lost $1,500. But $8,500 of capital was recycled via the rolled balance, meaning we only deployed $12,500 of actual new money ($10,500 + $2,000) and received $18,500 back.</p>
                        <p><strong>Current Compound Profit:</strong> $18,500 − $12,500 = $6,000</p>
                        <p><strong>Current ROI (on Cash Out):</strong> $6,000 / $12,500 = 48%</p>
                    </div>
                    <div className="dialog-footer">
                        <button className="btn" onClick={() => setShowCompoundInfo(false)}>Close</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
