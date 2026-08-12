import React from 'react';
import AccountManager from '../settings/accounts/AccountManager';

export default function AccessManager({ currentView, onViewChange }) {
  return <AccountManager currentView={currentView} onViewChange={onViewChange} />;
}
