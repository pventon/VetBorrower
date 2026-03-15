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
import { useState, useRef, useEffect } from "react";

interface ComboBoxOption {
    value: string;
    label: string;
}

interface ComboBoxProps {
    value: string;
    options: string[] | ComboBoxOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    maxVisible?: number;  // Max items before scrolling (default: unlimited)
    strictMode?: boolean; // When true, only options from the list are accepted
}

export default function ComboBox({ value, options, onChange, placeholder, style, maxVisible, strictMode }: ComboBoxProps) {
    // Normalize options to { value, label } pairs
    const normalizedOptions: ComboBoxOption[] = options.map(opt =>
        typeof opt === "string" ? { value: opt, label: opt } : opt
    );

    // Get display label for current value
    const displayValue = normalizedOptions.find(o => o.value === value)?.label ?? value;
    const [isOpen, setIsOpen] = useState(false);
    const [openAbove, setOpenAbove] = useState(false);
    const [filter, setFilter] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const checkDropDirection = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenAbove(spaceBelow < 180);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = normalizedOptions.filter(opt =>
        !filter || opt.label.toLowerCase().startsWith(filter.toLowerCase())
    );

    const itemHeight = 30; // approx height per item in px
    const dropdownMaxHeight = maxVisible ? maxVisible * itemHeight : 160;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                checkDropDirection();
                setIsOpen(true);
                setHighlightIndex(0);
            }
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex(prev => {
                const next = prev < filtered.length - 1 ? prev + 1 : 0;
                scrollItemIntoView(next);
                return next;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex(prev => {
                const next = prev > 0 ? prev - 1 : filtered.length - 1;
                scrollItemIntoView(next);
                return next;
            });
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightIndex >= 0 && highlightIndex < filtered.length) {
                handleSelect(filtered[highlightIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setFilter("");
        }
    };

    const scrollItemIntoView = (index: number) => {
        requestAnimationFrame(() => {
            if (!dropdownRef.current) return;
            const items = dropdownRef.current.children;
            if (items[index]) {
                (items[index] as HTMLElement).scrollIntoView({ block: "nearest" });
            }
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFilter(val);
        setHighlightIndex(0);
        if (strictMode) {
            // Only update value if it matches an option exactly
            const match = normalizedOptions.find(o => o.label.toLowerCase() === val.toLowerCase());
            if (match) onChange(match.value);
            // Don't call onChange with non-matching text in strict mode — filter only
        } else {
            const match = normalizedOptions.find(o => o.label.toLowerCase() === val.toLowerCase());
            onChange(match ? match.value : val);
        }
        checkDropDirection();
        setIsOpen(true);
    };

    const handleSelect = (opt: ComboBoxOption) => {
        onChange(opt.value);
        setFilter("");
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        setFilter("");
        checkDropDirection();
        setIsOpen(true);
    };

    const handleToggle = () => {
        if (!isOpen) {
            checkDropDirection();
            setFilter("");
            inputRef.current?.focus();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={containerRef} style={{ position: "relative", ...style }}>
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    display: "flex",
                    border: `1px solid ${isFocused || isHovered ? "#4a90d9" : "#ccc"}`,
                    borderRadius: "4px",
                    background: "#fff",
                    overflow: "hidden",
                    boxShadow: isFocused || isHovered ? "0 0 0 1px #4a90d9" : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? (filter || displayValue) : displayValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { setIsFocused(true); handleInputFocus(); }}
                    onBlur={() => {
                        setIsFocused(false);
                        if (strictMode && filter) {
                            const match = normalizedOptions.find(o => o.label.toLowerCase() === filter.toLowerCase());
                            if (!match && !value) onChange("");
                            setFilter("");
                        }
                    }}
                    placeholder={placeholder}
                    style={{ flex: 1, border: "none", outline: "none", padding: "0.35rem 0.5rem", fontSize: "inherit", background: "transparent" }}
                />
                <button
                    type="button"
                    onClick={handleToggle}
                    style={{
                        border: "none",
                        borderLeft: "1px solid #ccc",
                        background: "linear-gradient(to bottom, #f8f8f8, #e8e8e8)",
                        cursor: "pointer",
                        padding: "0 0.5rem",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <svg width="10" height="6" viewBox="0 0 10 6" style={{ fill: "#555" }}>
                        <path d="M0 0 L5 6 L10 0 Z" />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div style={{
                    position: "absolute",
                    ...(openAbove ? { bottom: "100%" } : { top: "100%" }),
                    left: 0,
                    right: 0,
                    maxHeight: `${dropdownMaxHeight}px`,
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    ...(openAbove
                        ? { borderBottom: "none", borderRadius: "4px 4px 0 0", boxShadow: "0 -4px 8px rgba(0,0,0,0.15)" }
                        : { borderTop: "none", borderRadius: "0 0 4px 4px", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }
                    ),
                    background: "#fff",
                    zIndex: 9999,
                }}>
                    <div ref={dropdownRef}>
                    {filtered.length > 0 ? (
                        filtered.map((opt, idx) => (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt)}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                style={{
                                    padding: "0.35rem 0.5rem",
                                    cursor: "pointer",
                                    fontSize: "inherit",
                                    borderBottom: "1px solid #f0f0f0",
                                    backgroundColor: idx === highlightIndex ? "#d0e4f7" : opt.value === value ? "#e3f2fd" : undefined,
                                }}
                            >
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: "0.35rem 0.5rem", color: "#999", fontSize: "inherit", fontStyle: "italic" }}>
                            {strictMode ? "No matching options" : value ? `"${value}" will be added as new` : "No options found"}
                        </div>
                    )}
                    </div>
                </div>
            )}
        </div>
    );
}
