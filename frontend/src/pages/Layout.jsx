import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import Statistics from './Statistics';
import Billing from './Billing';
import Security from './Security';
import TierManagement from './TierManagement';
import Classifications from './Classifications';
import Printers from './Printers';
import Pipelines from './Pipelines';
import AuditLogs from './AuditLogs.stub';
import PromptsManagement from './PromptsManagement';
import SearchControl from './SearchControl';
import UserManagement from './UserManagement';
import DepartmentManagement from './DepartmentManagement';
import APICatalogManager from './APICatalogManager';
import Companies from './Companies';
import TokenManagement from './TokenManagement';
import EnvironmentSettings from './EnvironmentSettings';
import Logs from './Logs';
import AutoFilingRules from './AutoFilingRules';

export default function Layout() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState('dashboard');

  const pages = {
    dashboard: <Dashboard />,
    statistics: <Statistics />,
    billing: <Billing />,
    security: <Security />,
    environment: <EnvironmentSettings />,
    tiers: <TierManagement />,
    classifications: <Classifications />,
    prompts: <PromptsManagement />,
    printers: <Printers />,
    pipelines: <Pipelines />,
    filing: <AutoFilingRules />,
    search: <SearchControl />,
    catalog: <APICatalogManager />,
    tokens: <TokenManagement />,
    users: <UserManagement />,
    companies: <Companies />,
    departments: <DepartmentManagement />,
    systemlogs: <Logs />,
    logs: <AuditLogs />
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        background: '#1e293b',
        color: 'white',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Aura Control Panel</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {user?.firstName} {user?.lastName}
          </p>
        </div>

        <nav style={{ flex: 1 }}>
          {[
            // Overview & Analytics
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'statistics', label: 'Statistics', icon: '📈' },
            { id: 'logs', label: 'Audit Logs', icon: '📜' },
            // Organization Management
            { id: 'companies', label: 'Companies', icon: '🏢' },
            { id: 'departments', label: 'Departments', icon: '🏛️' },
            { id: 'users', label: 'Users', icon: '👥' },
            // AI & Document Processing
            { id: 'pipelines', label: 'Pipelines', icon: '🔄' },
            { id: 'classifications', label: 'Classifications', icon: '📋' },
            { id: 'prompts', label: 'AI Prompts', icon: '💬' },
            { id: 'filing', label: 'Auto-Filing Rules', icon: '📁' },
            { id: 'search', label: 'Search Control', icon: '🔍' },
            // System Configuration
            { id: 'environment', label: 'Environment Config', icon: '⚙️' },
            { id: 'tiers', label: 'Tier Management', icon: '💎' },
            { id: 'printers', label: 'Printers', icon: '🖨️' },
            { id: 'catalog', label: 'API Catalog Manager', icon: '📚' },
            { id: 'tokens', label: 'Token Management', icon: '🔑' },
            // Security & Monitoring
            { id: 'security', label: 'Security Center', icon: '🔒' },
            { id: 'systemlogs', label: 'System Logs', icon: '🗂️' },
            { id: 'billing', label: 'Billing & Payments', icon: '💳' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 24px',
                background: page === item.id ? '#334155' : 'transparent',
                color: 'white',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                borderLeft: page === item.id ? '3px solid #667eea' : '3px solid transparent'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={logout}
          style={{
            margin: '0 24px',
            padding: '12px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, background: '#f8fafc', padding: '32px', overflow: 'auto', marginLeft: '260px' }}>
        {pages[page]}
      </div>
    </div>
  );
}
