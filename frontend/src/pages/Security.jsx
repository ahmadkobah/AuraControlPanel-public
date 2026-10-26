import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function Security() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [securityData, setSecurityData] = useState(null);
  const [settings, setSettings] = useState({
    // Current Settings (Editable)
    jwtExpiration: '7d',
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    sessionTimeout: 30, // minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15, // minutes
    tokenRefreshEnabled: true,
    apiRateLimit: 1000, // requests per hour
    
    // Phase 1 Features (High Priority - Not Implemented Yet)
    phase1_securityDashboard: false,
    phase1_activeSessionsMonitor: false,
    phase1_failedLoginLog: false,
    phase1_httpsEnforcement: false,
    phase1_rateLimitingDashboard: false,
    
    // Phase 2 Features (Medium Priority - Not Implemented Yet)
    phase2_auditLogExport: false,
    phase2_connectionMonitor: false,
    phase2_passwordPolicyUI: false,
    phase2_twoFactorAuth: false,
    phase2_certificateManager: false,
    
    // Phase 3 Features (Advanced - Not Implemented Yet)
    phase3_databaseEncryption: false,
    phase3_fieldLevelEncryption: false,
    phase3_dataFlowVisualization: false,
    phase3_complianceReports: false,
    phase3_documentEncryption: false,
    phase3_ipWhitelist: false
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/security/status');
      setSecurityData(data);
      if (data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (e) {
      setError(e.message || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    try {
      await api.post('/admin/security/settings', settings);
      alert('Security settings saved successfully!');
      await load();
    } catch (e) {
      alert(e.message || 'Failed to save settings');
    }
  };

  const testConnection = async (service) => {
    try {
      const result = await api.post('/admin/security/test-connection', { service });
      alert(`${service} connection: ${result.status}`);
    } catch (e) {
      alert(`Connection test failed: ${e.message}`);
    }
  };

  // Helper Components
  const FeaturePanel = ({ title, description, enabled, onToggle, children }) => (
    <div style={{
      padding: '20px',
      background: enabled ? '#f0fdf4' : '#f9fafb',
      borderRadius: '12px',
      border: `2px solid ${enabled ? '#22c55e' : '#e5e7eb'}`,
      opacity: 0.7
    }}>
      {/* Header with toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ 
            width: '20px', 
            height: '20px', 
            cursor: 'pointer',
            marginTop: '2px'
          }}
          disabled
        />
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '16px',
            marginBottom: '4px',
            color: enabled ? '#15803d' : '#374151'
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            {description}
          </div>
        </div>
        <span style={{ 
          padding: '4px 12px', 
          background: enabled ? '#dcfce7' : '#fef3c7',
          color: enabled ? '#15803d' : '#92400e',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {enabled ? 'Selected' : 'Not Selected'}
        </span>
      </div>

      {/* Settings Grid */}
      <div style={{ 
        display: 'grid', 
        gap: '12px',
        opacity: 0.85
      }}>
        {children}
      </div>

      {/* Disabled Notice */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#92400e',
        textAlign: 'center'
      }}>
        ⚠️ Feature not yet implemented - Settings shown for preview only
      </div>
    </div>
  );

  const ConfigRow = ({ label, description, type, value, options, min, max }) => (
    <div style={{
      padding: '12px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>
            {label}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {description}
          </div>
        </div>
        
        <div style={{ minWidth: '200px' }}>
          {type === 'toggle' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
              <input
                type="checkbox"
                checked={value}
                disabled
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {value ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          )}
          
          {type === 'select' && (
            <select
              value={value}
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                fontSize: '13px',
                cursor: 'not-allowed'
              }}
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          
          {type === 'number' && (
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                fontSize: '13px',
                cursor: 'not-allowed'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading security data...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>🔒 Security Center</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Monitor and configure system security settings</p>
      </div>

      {error && (
        <div style={{ 
          padding: '16px', 
          background: '#fee2e2', 
          border: '1px solid #fca5a5',
          borderRadius: '8px', 
          color: '#991b1b',
          marginBottom: '24px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Security Score Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard 
          icon="🔐" 
          label="Active Tokens" 
          value={securityData?.activeTokens || 0}
          color="#3b82f6"
        />
        <StatCard 
          icon="🔑" 
          label="API Keys" 
          value={securityData?.apiKeys || 0}
          color="#8b5cf6"
        />
        <StatCard 
          icon="📝" 
          label="Audit Logs (24h)" 
          value={securityData?.auditLogs24h || 0}
          color="#10b981"
        />
        <StatCard 
          icon="⚠️" 
          label="Failed Logins (24h)" 
          value={securityData?.failedLogins24h || 0}
          color="#ef4444"
        />
      </div>

      {/* Current Security Status */}
      <Section title="🛡️ Current Security Status" icon="✅">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <StatusItem 
            label="JWT Authentication"
            status="Active"
            details={`Token expiration: ${settings.jwtExpiration}`}
            healthy={true}
          />
          <StatusItem 
            label="Password Hashing"
            status="Active"
            details="bcrypt with salt rounds"
            healthy={true}
          />
          <StatusItem 
            label="Token Tracking"
            status="Active"
            details="SHA-256 hashing enabled"
            healthy={true}
          />
          <StatusItem 
            label="Audit Logging"
            status="Active"
            details="All actions tracked"
            healthy={true}
          />
          <StatusItem 
            label="MongoDB Authentication"
            status="Active"
            details="Secure connection enabled"
            healthy={true}
          />
          <StatusItem 
            label="HTTPS/TLS"
            status="Not Configured"
            details="HTTP only (not secure)"
            healthy={false}
          />
        </div>
      </Section>

      {/* Editable Settings */}
      <Section title="⚙️ Configurable Settings" icon="✏️">
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Authentication Settings */}
          <SettingsGroup title="Authentication & Tokens">
            <SettingRow
              label="JWT Expiration"
              value={settings.jwtExpiration}
              type="select"
              options={['1h', '6h', '12h', '24h', '7d', '30d', '90d']}
              onChange={(val) => setSettings({ ...settings, jwtExpiration: val })}
              description="How long JWT tokens remain valid"
            />
            <SettingRow
              label="Token Refresh"
              value={settings.tokenRefreshEnabled}
              type="toggle"
              onChange={(val) => setSettings({ ...settings, tokenRefreshEnabled: val })}
              description="Allow automatic token refresh before expiration"
            />
            <SettingRow
              label="API Rate Limit"
              value={settings.apiRateLimit}
              type="number"
              onChange={(val) => setSettings({ ...settings, apiRateLimit: val })}
              description="Maximum API requests per hour per user"
            />
          </SettingsGroup>

          {/* Password Policy */}
          <SettingsGroup title="Password Policy">
            <SettingRow
              label="Minimum Length"
              value={settings.passwordMinLength}
              type="number"
              min={6}
              max={32}
              onChange={(val) => setSettings({ ...settings, passwordMinLength: val })}
              description="Minimum password length"
            />
            <SettingRow
              label="Require Special Character"
              value={settings.passwordRequireSpecialChar}
              type="toggle"
              onChange={(val) => setSettings({ ...settings, passwordRequireSpecialChar: val })}
              description="Password must contain special characters (!@#$%^&*)"
            />
            <SettingRow
              label="Require Number"
              value={settings.passwordRequireNumber}
              type="toggle"
              onChange={(val) => setSettings({ ...settings, passwordRequireNumber: val })}
              description="Password must contain at least one number"
            />
            <SettingRow
              label="Require Uppercase"
              value={settings.passwordRequireUppercase}
              type="toggle"
              onChange={(val) => setSettings({ ...settings, passwordRequireUppercase: val })}
              description="Password must contain uppercase letters"
            />
          </SettingsGroup>

          {/* Session Management */}
          <SettingsGroup title="Session Management">
            <SettingRow
              label="Session Timeout"
              value={settings.sessionTimeout}
              type="number"
              min={5}
              max={120}
              onChange={(val) => setSettings({ ...settings, sessionTimeout: val })}
              description="Minutes of inactivity before session expires"
            />
            <SettingRow
              label="Max Login Attempts"
              value={settings.maxLoginAttempts}
              type="number"
              min={3}
              max={10}
              onChange={(val) => setSettings({ ...settings, maxLoginAttempts: val })}
              description="Failed login attempts before lockout"
            />
            <SettingRow
              label="Lockout Duration"
              value={settings.lockoutDuration}
              type="number"
              min={5}
              max={60}
              onChange={(val) => setSettings({ ...settings, lockoutDuration: val })}
              description="Minutes account is locked after max failed attempts"
            />
          </SettingsGroup>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            onClick={saveSettings}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            💾 Save Settings
          </button>
          <button
            onClick={load}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Reset to Saved
          </button>
        </div>
      </Section>

      {/* Essential Security Features */}
      <Section title="🚀 Essential Security Features" icon="🔴" badge="Not Implemented">
        <div style={{ 
          padding: '16px', 
          background: '#fef3c7', 
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#92400e',
          fontSize: '14px'
        }}>
          ⚠️ These features are planned but not yet implemented. Configure the settings below that will be applied once each feature is selected and implemented.
        </div>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Security Dashboard Enhancement */}
          <FeaturePanel
            title="Security Dashboard Enhancement"
            description="Comprehensive security overview with real-time threat detection and security score"
            enabled={settings.phase1_securityDashboard}
            onToggle={(val) => setSettings({ ...settings, phase1_securityDashboard: val })}
          >
            <ConfigRow label="Security Score Calculation" type="select" 
              value="realtime" 
              options={['realtime', 'hourly', 'daily']}
              description="How often to recalculate security score"
            />
            <ConfigRow label="Threat Detection" type="toggle" 
              value={true}
              description="Enable AI-based threat pattern detection"
            />
            <ConfigRow label="Alert Threshold" type="select"
              value="medium"
              options={['low', 'medium', 'high', 'critical']}
              description="Minimum severity level for security alerts"
            />
            <ConfigRow label="Dashboard Refresh Rate" type="number"
              value={30}
              min={10}
              max={300}
              description="Seconds between dashboard auto-refresh"
            />
            <ConfigRow label="Show Failed Attempts" type="toggle"
              value={true}
              description="Display failed login attempts on dashboard"
            />
          </FeaturePanel>

          {/* Active Sessions Monitor */}
          <FeaturePanel
            title="Active Sessions Monitor"
            description="View and manage all active user sessions with force logout capability"
            enabled={settings.phase1_activeSessionsMonitor}
            onToggle={(val) => setSettings({ ...settings, phase1_activeSessionsMonitor: val })}
          >
            <ConfigRow label="Session Display Mode" type="select"
              value="all"
              options={['all', 'active_only', 'suspicious_only']}
              description="Which sessions to show by default"
            />
            <ConfigRow label="Concurrent Session Limit" type="number"
              value={3}
              min={1}
              max={10}
              description="Maximum simultaneous sessions per user"
            />
            <ConfigRow label="Show Device Info" type="toggle"
              value={true}
              description="Display device and browser information"
            />
            <ConfigRow label="Show IP Address" type="toggle"
              value={true}
              description="Display IP address for each session"
            />
            <ConfigRow label="Force Logout Confirmation" type="toggle"
              value={true}
              description="Require confirmation before force logout"
            />
            <ConfigRow label="Session Timeout Warning" type="number"
              value={5}
              min={1}
              max={15}
              description="Minutes before timeout to warn user"
            />
          </FeaturePanel>

          {/* Failed Login Attempts Log */}
          <FeaturePanel
            title="Failed Login Attempts Log"
            description="Track and alert on suspicious login patterns and potential security threats"
            enabled={settings.phase1_failedLoginLog}
            onToggle={(val) => setSettings({ ...settings, phase1_failedLoginLog: val })}
          >
            <ConfigRow label="Log Retention" type="select"
              value="90days"
              options={['7days', '30days', '90days', '180days', '1year', 'forever']}
              description="How long to keep failed login records"
            />
            <ConfigRow label="Alert After Attempts" type="number"
              value={3}
              min={2}
              max={10}
              description="Failed attempts before sending alert"
            />
            <ConfigRow label="Alert Method" type="select"
              value="email_and_dashboard"
              options={['dashboard_only', 'email_only', 'email_and_dashboard', 'sms']}
              description="How to notify about suspicious activity"
            />
            <ConfigRow label="Auto-Block IPs" type="toggle"
              value={false}
              description="Automatically block IPs with repeated failures"
            />
            <ConfigRow label="Block Duration" type="number"
              value={60}
              min={15}
              max={1440}
              description="Minutes to block suspicious IPs (if enabled)"
            />
            <ConfigRow label="Whitelist Known IPs" type="toggle"
              value={true}
              description="Never block previously successful login IPs"
            />
          </FeaturePanel>

          {/* HTTPS/TLS Enforcement */}
          <FeaturePanel
            title="HTTPS/TLS Enforcement"
            description="Force secure connections with certificate management and auto-renewal"
            enabled={settings.phase1_httpsEnforcement}
            onToggle={(val) => setSettings({ ...settings, phase1_httpsEnforcement: val })}
          >
            <ConfigRow label="Minimum TLS Version" type="select"
              value="1.3"
              options={['1.0', '1.1', '1.2', '1.3']}
              description="Minimum allowed TLS protocol version"
            />
            <ConfigRow label="Redirect HTTP to HTTPS" type="toggle"
              value={true}
              description="Automatically redirect all HTTP requests to HTTPS"
            />
            <ConfigRow label="HSTS Enabled" type="toggle"
              value={true}
              description="Enable HTTP Strict Transport Security"
            />
            <ConfigRow label="HSTS Max Age" type="number"
              value={31536000}
              min={86400}
              max={63072000}
              description="Seconds for HSTS policy (1 year default)"
            />
            <ConfigRow label="Certificate Auto-Renewal" type="toggle"
              value={true}
              description="Automatically renew certificates before expiry"
            />
            <ConfigRow label="Renewal Days Before Expiry" type="number"
              value={30}
              min={7}
              max={90}
              description="Days before expiry to renew certificate"
            />
            <ConfigRow label="Certificate Provider" type="select"
              value="letsencrypt"
              options={['letsencrypt', 'custom', 'cloudflare', 'aws_acm']}
              description="SSL certificate provider"
            />
          </FeaturePanel>

          {/* Rate Limiting Dashboard */}
          <FeaturePanel
            title="Rate Limiting Dashboard"
            description="Monitor and configure API rate limits per user, tier, and endpoint"
            enabled={settings.phase1_rateLimitingDashboard}
            onToggle={(val) => setSettings({ ...settings, phase1_rateLimitingDashboard: val })}
          >
            <ConfigRow label="Rate Limit Strategy" type="select"
              value="sliding_window"
              options={['fixed_window', 'sliding_window', 'token_bucket', 'leaky_bucket']}
              description="Algorithm for rate limiting"
            />
            <ConfigRow label="Basic Tier Limit" type="number"
              value={1000}
              min={100}
              max={10000}
              description="Requests per hour for Basic tier"
            />
            <ConfigRow label="Plus Tier Limit" type="number"
              value={5000}
              min={1000}
              max={50000}
              description="Requests per hour for Plus tier"
            />
            <ConfigRow label="Pro Tier Limit" type="number"
              value={10000}
              min={5000}
              max={100000}
              description="Requests per hour for Pro tier"
            />
            <ConfigRow label="Burst Allowance" type="toggle"
              value={true}
              description="Allow temporary bursts above limit"
            />
            <ConfigRow label="Burst Multiplier" type="select"
              value="1.5x"
              options={['1.2x', '1.5x', '2x', '3x']}
              description="How much to allow during bursts"
            />
            <ConfigRow label="Rate Limit Response" type="select"
              value="429_error"
              options={['429_error', 'queue_request', 'throttle']}
              description="How to handle rate limit exceeded"
            />
            <ConfigRow label="Show Remaining Calls" type="toggle"
              value={true}
              description="Include remaining calls in API response headers"
            />
          </FeaturePanel>
        </div>
      </Section>

      {/* Advanced Security & Compliance */}
      <Section title="⚡ Advanced Security & Compliance" icon="🟡" badge="Not Implemented">
        <div style={{ 
          padding: '16px', 
          background: '#fef3c7', 
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#92400e',
          fontSize: '14px'
        }}>
          ⚠️ These features are planned but not yet implemented. Configure the settings below that will be applied once each feature is selected and implemented.
        </div>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Audit Log Export & Enhancement */}
          <FeaturePanel
            title="Audit Log Export & Enhancement"
            description="Enhanced audit logs with GDPR-compliant export and detailed timeline view"
            enabled={settings.phase2_auditLogExport}
            onToggle={(val) => setSettings({ ...settings, phase2_auditLogExport: val })}
          >
            <ConfigRow label="Export Format" type="select"
              value="json"
              options={['json', 'csv', 'xml', 'pdf']}
              description="Default format for audit log exports"
            />
            <ConfigRow label="Include User Details" type="toggle"
              value={true}
              description="Include full user information in exports"
            />
            <ConfigRow label="Include IP Addresses" type="toggle"
              value={true}
              description="Include IP addresses in audit logs"
            />
            <ConfigRow label="Log Retention Period" type="select"
              value="1year"
              options={['30days', '90days', '180days', '1year', '2years', '5years', 'forever']}
              description="How long to retain audit logs"
            />
            <ConfigRow label="Auto-Export Schedule" type="select"
              value="monthly"
              options={['disabled', 'weekly', 'monthly', 'quarterly', 'yearly']}
              description="Automatic export schedule for compliance"
            />
            <ConfigRow label="Compliance Standard" type="select"
              value="gdpr"
              options={['gdpr', 'soc2', 'hipaa', 'iso27001', 'pci_dss']}
              description="Primary compliance standard to follow"
            />
            <ConfigRow label="Timeline View" type="toggle"
              value={true}
              description="Enable visual timeline view of audit events"
            />
          </FeaturePanel>

          {/* Real-Time Connection Monitor */}
          <FeaturePanel
            title="Real-Time Connection Monitor"
            description="Monitor all active database and API connections with encryption status"
            enabled={settings.phase2_connectionMonitor}
            onToggle={(val) => setSettings({ ...settings, phase2_connectionMonitor: val })}
          >
            <ConfigRow label="Monitor Refresh Rate" type="number"
              value={5}
              min={1}
              max={60}
              description="Seconds between connection status updates"
            />
            <ConfigRow label="Show Encryption Details" type="toggle"
              value={true}
              description="Display TLS/SSL encryption information"
            />
            <ConfigRow label="Track Query Performance" type="toggle"
              value={true}
              description="Monitor query execution times"
            />
            <ConfigRow label="Connection Timeout Alert" type="number"
              value={30}
              min={10}
              max={300}
              description="Seconds before alerting on slow connections"
            />
            <ConfigRow label="Max Connections Alert" type="number"
              value={80}
              min={50}
              max={100}
              description="Percent of max connections before alert"
            />
            <ConfigRow label="Show Geographic Info" type="toggle"
              value={true}
              description="Display connection geographic location"
            />
            <ConfigRow label="Alert on Unencrypted" type="toggle"
              value={true}
              description="Alert when unencrypted connections detected"
            />
          </FeaturePanel>

          {/* Password Policy UI */}
          <FeaturePanel
            title="Password Policy UI"
            description="Visual password strength indicator and policy enforcement"
            enabled={settings.phase2_passwordPolicyUI}
            onToggle={(val) => setSettings({ ...settings, phase2_passwordPolicyUI: val })}
          >
            <ConfigRow label="Strength Meter Style" type="select"
              value="progressive_bar"
              options={['progressive_bar', 'color_indicator', 'score_display', 'detailed_breakdown']}
              description="Visual style for password strength indicator"
            />
            <ConfigRow label="Show Password Tips" type="toggle"
              value={true}
              description="Display helpful tips for creating strong passwords"
            />
            <ConfigRow label="Dictionary Check" type="toggle"
              value={true}
              description="Check against common password dictionary"
            />
            <ConfigRow label="Breach Database Check" type="toggle"
              value={true}
              description="Verify password hasn't been in known breaches"
            />
            <ConfigRow label="Password History" type="number"
              value={5}
              min={0}
              max={24}
              description="Number of previous passwords to prevent reuse"
            />
            <ConfigRow label="Expiration Policy" type="select"
              value="90days"
              options={['never', '30days', '60days', '90days', '180days', '365days']}
              description="Force password change interval"
            />
            <ConfigRow label="Minimum Strength Required" type="select"
              value="strong"
              options={['weak', 'fair', 'good', 'strong', 'very_strong']}
              description="Minimum acceptable password strength"
            />
          </FeaturePanel>

          {/* Two-Factor Authentication (2FA) */}
          <FeaturePanel
            title="Two-Factor Authentication (2FA)"
            description="TOTP-based 2FA for enhanced account security"
            enabled={settings.phase2_twoFactorAuth}
            onToggle={(val) => setSettings({ ...settings, phase2_twoFactorAuth: val })}
          >
            <ConfigRow label="2FA Method" type="select"
              value="totp"
              options={['totp', 'sms', 'email', 'hardware_key', 'multiple']}
              description="Primary two-factor authentication method"
            />
            <ConfigRow label="Mandatory for Roles" type="select"
              value="superadmin_only"
              options={['none', 'superadmin_only', 'admin_and_above', 'all_users']}
              description="Which user roles require 2FA"
            />
            <ConfigRow label="Grace Period" type="number"
              value={7}
              min={0}
              max={30}
              description="Days to allow setup before enforcing 2FA"
            />
            <ConfigRow label="Backup Codes Count" type="number"
              value={10}
              min={5}
              max={20}
              description="Number of backup codes to generate"
            />
            <ConfigRow label="Remember Device" type="toggle"
              value={true}
              description="Allow users to trust devices for 30 days"
            />
            <ConfigRow label="TOTP Time Step" type="select"
              value="30s"
              options={['30s', '60s']}
              description="Time window for TOTP code validity"
            />
            <ConfigRow label="Allow Recovery Email" type="toggle"
              value={true}
              description="Enable email-based 2FA recovery"
            />
          </FeaturePanel>

          {/* Certificate Manager */}
          <FeaturePanel
            title="Certificate Manager"
            description="View, upload, and manage SSL/TLS certificates with expiration alerts"
            enabled={settings.phase2_certificateManager}
            onToggle={(val) => setSettings({ ...settings, phase2_certificateManager: val })}
          >
            <ConfigRow label="Certificate Type" type="select"
              value="letsencrypt"
              options={['letsencrypt', 'custom', 'self_signed', 'enterprise_ca']}
              description="Primary certificate source"
            />
            <ConfigRow label="Auto-Renewal" type="toggle"
              value={true}
              description="Automatically renew certificates before expiry"
            />
            <ConfigRow label="Renewal Notice Period" type="number"
              value={30}
              min={7}
              max={90}
              description="Days before expiry to send renewal alerts"
            />
            <ConfigRow label="Alert Recipients" type="select"
              value="admins"
              options={['superadmin_only', 'admins', 'all_it_staff', 'custom_emails']}
              description="Who receives certificate expiration alerts"
            />
            <ConfigRow label="Certificate Validation" type="toggle"
              value={true}
              description="Validate certificate chain and trust"
            />
            <ConfigRow label="OCSP Stapling" type="toggle"
              value={true}
              description="Enable OCSP stapling for better performance"
            />
            <ConfigRow label="Certificate Pinning" type="toggle"
              value={false}
              description="Enable certificate pinning (advanced)"
            />
          </FeaturePanel>
        </div>
      </Section>

      {/* Enterprise Security & Data Protection */}
      <Section title="💎 Enterprise Security & Data Protection" icon="🟢" badge="Not Implemented">
        <div style={{ 
          padding: '16px', 
          background: '#fef3c7', 
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#92400e',
          fontSize: '14px'
        }}>
          ⚠️ These features are planned but not yet implemented. Configure the settings below that will be applied once each feature is selected and implemented.
        </div>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Database Encryption at Rest */}
          <FeaturePanel
            title="Database Encryption at Rest"
            description="Encrypt all data at rest in MongoDB with automatic key rotation"
            enabled={settings.phase3_databaseEncryption}
            onToggle={(val) => setSettings({ ...settings, phase3_databaseEncryption: val })}
          >
            <ConfigRow label="Encryption Algorithm" type="select"
              value="aes_256_gcm"
              options={['aes_128_gcm', 'aes_256_gcm', 'aes_256_cbc', 'chacha20_poly1305']}
              description="Encryption algorithm for data at rest"
            />
            <ConfigRow label="Key Management" type="select"
              value="aws_kms"
              options={['local', 'aws_kms', 'azure_key_vault', 'google_kms', 'hashicorp_vault']}
              description="Where to store and manage encryption keys"
            />
            <ConfigRow label="Auto Key Rotation" type="toggle"
              value={true}
              description="Automatically rotate encryption keys"
            />
            <ConfigRow label="Rotation Interval" type="select"
              value="90days"
              options={['30days', '90days', '180days', '365days']}
              description="How often to rotate encryption keys"
            />
            <ConfigRow label="Encrypt Indexes" type="toggle"
              value={false}
              description="Also encrypt database indexes (impacts performance)"
            />
            <ConfigRow label="Encrypt Backups" type="toggle"
              value={true}
              description="Encrypt database backups with same keys"
            />
            <ConfigRow label="Key Escrow" type="toggle"
              value={false}
              description="Enable key escrow for emergency access"
            />
          </FeaturePanel>

          {/* Field-Level Encryption */}
          <FeaturePanel
            title="Field-Level Encryption"
            description="Encrypt sensitive fields individually with separate encryption keys"
            enabled={settings.phase3_fieldLevelEncryption}
            onToggle={(val) => setSettings({ ...settings, phase3_fieldLevelEncryption: val })}
          >
            <ConfigRow label="Encryption Mode" type="select"
              value="deterministic"
              options={['deterministic', 'random', 'hybrid']}
              description="Deterministic allows queries, random is more secure"
            />
            <ConfigRow label="Default Fields to Encrypt" type="select"
              value="pii_only"
              options={['none', 'pii_only', 'sensitive_data', 'all_user_data', 'custom']}
              description="Which fields to encrypt by default"
            />
            <ConfigRow label="Key Per Company" type="toggle"
              value={true}
              description="Use separate encryption keys for each company"
            />
            <ConfigRow label="Key Per User" type="toggle"
              value={false}
              description="Use separate encryption keys for each user (very secure)"
            />
            <ConfigRow label="Client-Side Encryption" type="toggle"
              value={true}
              description="Encrypt data on client before sending to server"
            />
            <ConfigRow label="Searchable Encryption" type="toggle"
              value={false}
              description="Allow searching encrypted fields (reduced security)"
            />
            <ConfigRow label="Audit Field Access" type="toggle"
              value={true}
              description="Log all access to encrypted fields"
            />
          </FeaturePanel>

          {/* Data Flow Visualization */}
          <FeaturePanel
            title="Data Flow Visualization"
            description="Visual map of how data moves through the system with security checkpoints"
            enabled={settings.phase3_dataFlowVisualization}
            onToggle={(val) => setSettings({ ...settings, phase3_dataFlowVisualization: val })}
          >
            <ConfigRow label="Visualization Style" type="select"
              value="flowchart"
              options={['flowchart', 'network_graph', 'sankey_diagram', 'timeline']}
              description="Visual representation style"
            />
            <ConfigRow label="Show Encryption Status" type="toggle"
              value={true}
              description="Highlight encrypted vs unencrypted data flows"
            />
            <ConfigRow label="Show Access Controls" type="toggle"
              value={true}
              description="Display permission checkpoints in data flow"
            />
            <ConfigRow label="Real-Time Updates" type="toggle"
              value={true}
              description="Update visualization in real-time"
            />
            <ConfigRow label="Show External Services" type="toggle"
              value={true}
              description="Include external API calls and services"
            />
            <ConfigRow label="Data Classification" type="toggle"
              value={true}
              description="Color-code by data sensitivity level"
            />
            <ConfigRow label="Export Diagram" type="select"
              value="png"
              options={['png', 'svg', 'pdf', 'json']}
              description="Format for exporting data flow diagrams"
            />
          </FeaturePanel>

          {/* Compliance Reports */}
          <FeaturePanel
            title="Compliance Reports"
            description="Generate automated compliance reports for GDPR, SOC2, and HIPAA"
            enabled={settings.phase3_complianceReports}
            onToggle={(val) => setSettings({ ...settings, phase3_complianceReports: val })}
          >
            <ConfigRow label="Primary Standard" type="select"
              value="gdpr"
              options={['gdpr', 'soc2', 'hipaa', 'iso27001', 'pci_dss', 'ccpa']}
              description="Primary compliance standard to report on"
            />
            <ConfigRow label="Report Frequency" type="select"
              value="monthly"
              options={['weekly', 'monthly', 'quarterly', 'yearly', 'on_demand']}
              description="How often to generate reports"
            />
            <ConfigRow label="Auto-Send Reports" type="toggle"
              value={true}
              description="Automatically email reports to stakeholders"
            />
            <ConfigRow label="Include Recommendations" type="toggle"
              value={true}
              description="Add AI-generated compliance recommendations"
            />
            <ConfigRow label="Gap Analysis" type="toggle"
              value={true}
              description="Identify compliance gaps and missing controls"
            />
            <ConfigRow label="Historical Comparison" type="toggle"
              value={true}
              description="Compare compliance score over time"
            />
            <ConfigRow label="Third-Party Audit Ready" type="toggle"
              value={true}
              description="Format reports for external auditors"
            />
            <ConfigRow label="Report Format" type="select"
              value="pdf"
              options={['pdf', 'html', 'docx', 'json', 'multi_format']}
              description="Output format for compliance reports"
            />
          </FeaturePanel>

          {/* Document Encryption */}
          <FeaturePanel
            title="Document Encryption"
            description="Encrypt uploaded documents with per-company encryption keys"
            enabled={settings.phase3_documentEncryption}
            onToggle={(val) => setSettings({ ...settings, phase3_documentEncryption: val })}
          >
            <ConfigRow label="Encryption Method" type="select"
              value="aes_256_gcm"
              options={['aes_128_gcm', 'aes_256_gcm', 'aes_256_cbc']}
              description="Encryption algorithm for documents"
            />
            <ConfigRow label="Encrypt on Upload" type="toggle"
              value={true}
              description="Automatically encrypt documents on upload"
            />
            <ConfigRow label="Key Scope" type="select"
              value="per_company"
              options={['global', 'per_company', 'per_department', 'per_user', 'per_document']}
              description="Encryption key isolation level"
            />
            <ConfigRow label="Preserve Metadata" type="toggle"
              value={true}
              description="Keep document metadata unencrypted for search"
            />
            <ConfigRow label="Version Encryption" type="toggle"
              value={true}
              description="Encrypt all document versions"
            />
            <ConfigRow label="Watermark Documents" type="toggle"
              value={false}
              description="Add security watermarks to documents"
            />
            <ConfigRow label="DRM Protection" type="toggle"
              value={false}
              description="Enable digital rights management"
            />
            <ConfigRow label="Expiring Access" type="toggle"
              value={false}
              description="Allow setting document access expiration"
            />
          </FeaturePanel>

          {/* IP Whitelist/Blacklist */}
          <FeaturePanel
            title="IP Whitelist/Blacklist"
            description="Control access based on IP addresses with geographic restrictions"
            enabled={settings.phase3_ipWhitelist}
            onToggle={(val) => setSettings({ ...settings, phase3_ipWhitelist: val })}
          >
            <ConfigRow label="Default Policy" type="select"
              value="allow_all"
              options={['allow_all', 'deny_all', 'whitelist_mode', 'blacklist_mode']}
              description="Default IP access policy"
            />
            <ConfigRow label="Geographic Restrictions" type="toggle"
              value={false}
              description="Block/allow access by country"
            />
            <ConfigRow label="VPN Detection" type="toggle"
              value={true}
              description="Detect and flag VPN/proxy usage"
            />
            <ConfigRow label="Tor Network Block" type="toggle"
              value={true}
              description="Block access from Tor exit nodes"
            />
            <ConfigRow label="Auto-Block Threats" type="toggle"
              value={true}
              description="Automatically block IPs from threat databases"
            />
            <ConfigRow label="Rate Limit by IP" type="toggle"
              value={true}
              description="Apply stricter rate limits to unknown IPs"
            />
            <ConfigRow label="Whitelist Duration" type="select"
              value="permanent"
              options={['7days', '30days', '90days', '1year', 'permanent']}
              description="How long to keep IPs on whitelist"
            />
            <ConfigRow label="Alert on New Location" type="toggle"
              value={true}
              description="Alert users when logging in from new location"
            />
          </FeaturePanel>
        </div>
      </Section>

      {/* Connection Tests */}
      <Section title="🔌 Connection Tests" icon="🧪">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          <button
            onClick={() => testConnection('mongodb')}
            style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #10b981',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              🍃 Test MongoDB
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Verify database connection
            </div>
          </button>
          <button
            onClick={() => testConnection('aura')}
            style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              🔧 Test Aura Backend
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Check API connectivity
            </div>
          </button>
          <button
            onClick={() => testConnection('ai_service')}
            style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #8b5cf6',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              🤖 Test AI Service
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Verify AI service health
            </div>
          </button>
        </div>
      </Section>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: `2px solid ${color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
    </div>
  );
}

function Section({ title, icon, badge, children }) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
          {title}
        </h2>
        {badge && (
          <span style={{
            padding: '4px 12px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusItem({ label, status, details, healthy }) {
  return (
    <div style={{
      padding: '16px',
      background: healthy ? '#f0fdf4' : '#fef2f2',
      border: `2px solid ${healthy ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{label}</div>
        <span style={{
          padding: '3px 8px',
          background: healthy ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{details}</div>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div style={{
      padding: '20px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gap: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, value, type, options, min, max, onChange, description }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{description}</div>
      </div>
      <div style={{ minWidth: '150px' }}>
        {type === 'toggle' && (
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: value ? '#10b981' : '#64748b', fontWeight: '600' }}>
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        )}
        {type === 'number' && (
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => onChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        )}
        {type === 'select' && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function FeatureToggle({ label, description, enabled, onChange }) {
  return (
    <div style={{
      padding: '16px',
      background: enabled ? '#f0fdf4' : '#f8fafc',
      border: `2px solid ${enabled ? '#10b981' : '#e2e8f0'}`,
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{description}</div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginRight: '8px', width: '20px', height: '20px', cursor: 'pointer' }}
        />
        <span style={{ 
          fontSize: '13px', 
          fontWeight: '600',
          color: enabled ? '#10b981' : '#94a3b8'
        }}>
          {enabled ? 'Selected' : 'Not Selected'}
        </span>
      </label>
    </div>
  );
}
