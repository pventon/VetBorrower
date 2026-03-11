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

import { useState } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import MenuBar from "./components/MenuBar";
import UserAccountsDialog from "./components/UserAccountsDialog";
import SystemSettingsDialog from "./components/SystemSettingsDialog";
import OfficeDlg from "./components/OfficeDlg";
import CorporationsDlg from "./components/CorporationsDlg";
import BrokersDlg from "./components/BrokersDlg";
import DealsDlg from "./components/DealsDlg";

function App() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const [showUserAccounts, setShowUserAccounts] = useState(false);
    const [showSystemSettings, setShowSystemSettings] = useState(false);
    const [showOffices, setShowOffices] = useState(false);
    const [showCorporations, setShowCorporations] = useState(false);
    const [showBrokers, setShowBrokers] = useState(false);
    const [showDeals, setShowDeals] = useState(false);

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-title">
                    <img src="/dollar-icon.png" alt="Logo" className="app-title-logo" />
                    <h1>Vet Borrower</h1>
                </div>
                <div className="user-info">
                    <span>{user?.firstName} {user?.lastName} ({user?.role})</span>
                    <button onClick={logout}>Sign Out</button>
                </div>
            </header>
            <MenuBar
                onUserAccounts={() => setShowUserAccounts(true)}
                onSystemSettings={() => setShowSystemSettings(true)}
                onOffices={() => setShowOffices(true)}
                onCorporations={() => setShowCorporations(true)}
                onBrokers={() => setShowBrokers(true)}
                onDeals={() => setShowDeals(true)}
            />
            <main>
                <p>Welcome to VetBorrower - Under Construction</p>
            </main>

            {showUserAccounts && (
                <UserAccountsDialog onClose={() => setShowUserAccounts(false)} />
            )}
            {showSystemSettings && (
                <SystemSettingsDialog onClose={() => setShowSystemSettings(false)} />
            )}
            {showOffices && (
                <OfficeDlg onClose={() => setShowOffices(false)} />
            )}
            {showCorporations && (
                <CorporationsDlg onClose={() => setShowCorporations(false)} />
            )}
            {showBrokers && (
                <BrokersDlg onClose={() => setShowBrokers(false)} />
            )}
            {showDeals && (
                <DealsDlg onClose={() => setShowDeals(false)} />
            )}
        </div>
    );
}

export default App;
