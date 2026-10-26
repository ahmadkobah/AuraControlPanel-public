import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function EnvironmentSettings() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('control-panel');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Service-specific configurations
  const [controlPanelConfig, setControlPanelConfig] = useState({});
  const [auraConfig, setauraConfig] = useState({});
  const [aiServiceConfig, setAiServiceConfig] = useState({});

  useEffect(() => {
    loadConfigurations();
  }, []);

  async function loadConfigurations() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/environment/all');
      setControlPanelConfig(data.controlPanel || {});
      setauraConfig(data.aura || {});
      setAiServiceConfig(data.aiService || {});
    } catch (e) {
      setError(e.message || 'Failed to load environment configurations');
    } finally {
      setLoading(false);
    }
  }

  async function saveConfiguration(service) {
    setError(null);
    setSuccess(null);
    try {
      const configMap = {
        'control-panel': controlPanelConfig,
        'aura': auraConfig,
        'ai-service': aiServiceConfig
      };
      
      await api.put(`/admin/environment/${service}`, configMap[service]);
      setSuccess(`✅ ${service} configuration saved successfully! Service restart may be required.`);
      setHasChanges(false);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e.message || 'Failed to save configuration');
    }
  }

  async function restartService(service) {
    if (!confirm(`Restart ${service} service? This may cause brief downtime.`)) return;
    
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/admin/environment/${service}/restart`);
      setSuccess(`✅ ${service} restart signal sent. Check service logs for status.`);
    } catch (e) {
      setError(e.message || 'Failed to restart service');
    }
  }

  const tabs = [
    { id: 'control-panel', label: 'Control Panel', icon: '🎛️', port: '4000' },
    { id: 'aura', label: 'Aura Backend', icon: '🗄️', port: '8000' },
    { id: 'ai-service-basic', label: 'AI Service - Basic', icon: '🥉', port: '9000', tier: 'basic' },
    { id: 'ai-service-plus', label: 'AI Service - Plus', icon: '🥈', port: '9001', tier: 'plus' },
    { id: 'ai-service-pro', label: 'AI Service - Pro', icon: '🥇', port: '9002', tier: 'pro' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
        <div>Loading environment configurations...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>
          ⚙️ Environment Configuration
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
          Manage system-wide environment variables for all services
        </p>
      </div>

      {/* Warning Banner - Updated */}
      <div style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '3px solid #f59e0b',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <span style={{ fontSize: '36px' }}>🔧</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '8px', fontSize: '18px' }}>
              ⚠️ Developer/Debug Tool - Not for Regular Configuration
            </div>
            <div style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6', marginBottom: '12px' }}>
              This page manages raw <strong>.env files</strong> and requires <strong>service restarts</strong> to take effect.
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.7)', 
              padding: '12px', 
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <strong>⛔ For AI Configuration:</strong> Use <strong>Pipelines Page</strong> instead
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>✅ Real-time sync (no restart needed)</li>
                <li>✅ 47 AI parameters</li>
                <li>✅ Tier/Company management</li>
                <li>✅ Persists to database</li>
              </ul>
            </div>
            <div style={{ fontSize: '13px', color: '#78350f', fontStyle: 'italic' }}>
              💡 Use this page only for service URLs, ports, and low-level system settings
            </div>
          </div>
        </div>
      </div>

      {/* Global Messages */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div style={{
          padding: '16px',
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          color: '#065f46',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>{success}</div>
        </div>
      )}

      {/* Service Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#667eea' : '#64748b',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #667eea' : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px'
            }}
          >
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{
              padding: '2px 8px',
              background: '#f1f5f9',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#64748b'
            }}>
              :{tab.port}
            </span>
          </button>
        ))}
      </div>

      {/* Configuration Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {activeTab === 'control-panel' && (
          <ControlPanelConfig 
            config={controlPanelConfig}
            setConfig={setControlPanelConfig}
            onChange={() => setHasChanges(true)}
          />
        )}
        
        {activeTab === 'aura' && (
          <AuraConfig 
            config={auraConfig}
            setConfig={setauraConfig}
            onChange={() => setHasChanges(true)}
          />
        )}
        
        {activeTab === 'ai-service' && (
          <AiServiceConfig 
            config={aiServiceConfig}
            setConfig={setAiServiceConfig}
            onChange={() => setHasChanges(true)}
          />
        )}

        {/* Action Buttons */}
        <div style={{
          padding: '24px',
          borderTop: '2px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => saveConfiguration(activeTab)}
              disabled={!hasChanges}
              style={{
                padding: '12px 24px',
                background: hasChanges ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              💾 Save Configuration
            </button>
            <button
              onClick={loadConfigurations}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Reload
            </button>
          </div>
          
          <button
            onClick={() => restartService(activeTab)}
            style={{
              padding: '12px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Restart Service
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
              Configuration Tips
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a', fontSize: '14px', lineHeight: '1.6' }}>
              <li>Changes take effect after saving and restarting the service</li>
              <li>MongoDB URLs should include the database name in the connection string</li>
              <li>SMTP settings require valid credentials - test before saving</li>
              <li>JWT secrets should be long, random strings (min 32 characters)</li>
              <li>CORS origins must include the protocol (http:// or https://)</li>
              <li>Always backup your .env files before making changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Control Panel Configuration Component
function ControlPanelConfig({ config, setConfig, onChange }) {
  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
    onChange();
  };

  return (
    <div style={{ padding: '24px' }}>
      <ConfigSection title="Server Configuration" icon="🖥️">
        <ConfigField
          label="Port"
          description="Port number for the Control Panel API server"
          value={config.PORT || '4000'}
          onChange={(v) => updateField('PORT', v)}
          placeholder="4000"
          type="number"
        />
      </ConfigSection>

      <ConfigSection title="Database Configuration" icon="🗄️">
        <ConfigField
          label="MongoDB URL"
          description="Full MongoDB connection string including database name"
          value={config.MONGO_URL || ''}
          onChange={(v) => updateField('MONGO_URL', v)}
          placeholder="mongodb+srv://user:pass@host/database"
          type="text"
          fullWidth
        />
        <ConfigField
          label="Database Name"
          description="MongoDB database name (usually 'aura')"
          value={config.DATABASE_NAME || 'aura'}
          onChange={(v) => updateField('DATABASE_NAME', v)}
          placeholder="aura"
        />
      </ConfigSection>

      <ConfigSection title="Authentication" icon="🔐">
        <ConfigField
          label="JWT Secret"
          description="Secret key for signing JWT tokens (min 32 characters)"
          value={config.ADMIN_JWT_SECRET || ''}
          onChange={(v) => updateField('ADMIN_JWT_SECRET', v)}
          placeholder="your_secret_here_min_32_chars"
          type="password"
          fullWidth
        />
      </ConfigSection>

      <ConfigSection title="Service URLs" icon="🔗">
        <ConfigField
          label="aura URL"
          description="Base URL for Aura Backend API"
          value={config.AURA_BACKEND_URL || 'http://localhost:8000'}
          onChange={(v) => updateField('AURA_BACKEND_URL', v)}
          placeholder="http://localhost:8000"
        />
        <ConfigField
          label="AI Service URL"
          description="Base URL for AI Service API"
          value={config.AI_SERVICE_URL || 'http://localhost:9000'}
          onChange={(v) => updateField('AI_SERVICE_URL', v)}
          placeholder="http://localhost:9000"
        />
      </ConfigSection>
    </div>
  );
}

// Aura Configuration Component
function AuraConfig({ config, setConfig, onChange }) {
  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
    onChange();
  };

  return (
    <div style={{ padding: '24px' }}>
      <ConfigSection title="Server Configuration" icon="🖥️">
        <ConfigField
          label="Port"
          description="Port number for Aura Backend server"
          value={config.PORT || '8000'}
          onChange={(v) => updateField('PORT', v)}
          placeholder="8000"
          type="number"
        />
        <ConfigField
          label="Base URL"
          description="Public-facing base URL for the application"
          value={config.APP_BASE_URL || 'http://localhost:8000'}
          onChange={(v) => updateField('APP_BASE_URL', v)}
          placeholder="http://localhost:8000"
        />
      </ConfigSection>

      <ConfigSection title="Database Configuration" icon="🗄️">
        <ConfigField
          label="MongoDB URL"
          description="Full MongoDB connection string"
          value={config.DB || ''}
          onChange={(v) => updateField('DB', v)}
          placeholder="mongodb+srv://user:pass@host/database"
          type="text"
          fullWidth
        />
      </ConfigSection>

      <ConfigSection title="Authentication" icon="🔐">
        <ConfigField
          label="JWT Secret"
          description="Secret key for signing JWT tokens"
          value={config.JWT_SECRET || ''}
          onChange={(v) => updateField('JWT_SECRET', v)}
          placeholder="superlongrandomstring"
          type="password"
          fullWidth
        />
      </ConfigSection>

      <ConfigSection title="SMTP Email Configuration" icon="📧">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <ConfigField
            label="SMTP Host"
            description="Email server hostname"
            value={config.SMTP_HOST || 'smtp.gmail.com'}
            onChange={(v) => updateField('SMTP_HOST', v)}
            placeholder="smtp.gmail.com"
          />
          <ConfigField
            label="SMTP Port"
            description="Email server port"
            value={config.SMTP_PORT || '465'}
            onChange={(v) => updateField('SMTP_PORT', v)}
            placeholder="465"
            type="number"
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ConfigField
            label="SMTP User"
            description="Email account username"
            value={config.SMTP_USER || ''}
            onChange={(v) => updateField('SMTP_USER', v)}
            placeholder="your-email@gmail.com"
          />
          <ConfigField
            label="SMTP Password"
            description="Email account password or app password"
            value={config.SMTP_PASS || ''}
            onChange={(v) => updateField('SMTP_PASS', v)}
            placeholder="App password"
            type="password"
          />
        </div>

        <ConfigField
          label="From Address"
          description="Default sender email address"
          value={config.SMTP_FROM || ''}
          onChange={(v) => updateField('SMTP_FROM', v)}
          placeholder='"aura" <noreply@aura.app>'
          fullWidth
        />

        <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.SMTP_SECURE === 'true'}
              onChange={(e) => updateField('SMTP_SECURE', e.target.checked ? 'true' : 'false')}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Use SSL/TLS</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.SMTP_TLS_REJECT_UNAUTHORIZED === 'false'}
              onChange={(e) => updateField('SMTP_TLS_REJECT_UNAUTHORIZED', e.target.checked ? 'false' : 'true')}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Allow Self-Signed Certificates</span>
          </label>
        </div>
      </ConfigSection>

      <ConfigSection title="Service URLs" icon="🔗">
        <ConfigField
          label="AI Service URL"
          description="URL for AI processing service"
          value={config.AI_SERVICE_URL || 'http://localhost:9000'}
          onChange={(v) => updateField('AI_SERVICE_URL', v)}
          placeholder="http://localhost:9000"
        />
      </ConfigSection>
    </div>
  );
}

// AI Service Configuration Component
function AiServiceConfig({ config, setConfig, onChange }) {
  const updateField = (field, value) => {
    setConfig({ ...config, [field]: value });
    onChange();
  };

  return (
    <div style={{ padding: '24px' }}>
      <ConfigSection title="Server Configuration" icon="🖥️">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ConfigField
            label="API Port"
            description="Port number for AI Service"
            value={config.PORT || config.API_PORT || '9000'}
            onChange={(v) => {
              updateField('PORT', v);
              updateField('API_PORT', v);
            }}
            placeholder="9000"
            type="number"
          />
          <ConfigField
            label="API Host"
            description="Host IP address to bind"
            value={config.API_HOST || '0.0.0.0'}
            onChange={(v) => updateField('API_HOST', v)}
            placeholder="0.0.0.0"
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Database Configuration" icon="🗄️">
        <ConfigField
          label="MongoDB URL"
          description="MongoDB connection string (supports multiple aliases)"
          value={config.MONGO_URL || config.MONGODB_URI || config.DB || ''}
          onChange={(v) => {
            updateField('MONGO_URL', v);
            updateField('MONGODB_URI', v);
            updateField('DB', v);
          }}
          placeholder="mongodb+srv://user:pass@host/database"
          type="text"
          fullWidth
        />
        <ConfigField
          label="Database Name"
          description="MongoDB database name"
          value={config.DATABASE_NAME || config.MONGODB_DB || 'aura'}
          onChange={(v) => {
            updateField('DATABASE_NAME', v);
            updateField('MONGODB_DB', v);
          }}
          placeholder="aura"
        />
      </ConfigSection>

      <ConfigSection title="AI Configuration" icon="🤖">
        <ConfigField
          label="Llamafile URL"
          description="URL for Llamafile AI inference server"
          value={config.LLAMAFILE_URL || 'http://localhost:8080'}
          onChange={(v) => updateField('LLAMAFILE_URL', v)}
          placeholder="http://localhost:8080"
          fullWidth
        />
      </ConfigSection>

      <ConfigSection title="GPU Configuration" icon="🎮">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <ConfigField
            label="GPU Layers"
            description="Number of model layers to run on GPU"
            value={config.GPU_LAYERS || '29'}
            onChange={(v) => updateField('GPU_LAYERS', v)}
            placeholder="29"
            type="number"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.USE_GPU === 'true' || config.FORCE_GPU === 'true'}
                onChange={(e) => {
                  const val = e.target.checked ? 'true' : 'false';
                  updateField('USE_GPU', val);
                  updateField('FORCE_GPU', val);
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>Enable GPU Acceleration</span>
            </label>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Logging Configuration" icon="📝">
        <ConfigField
          label="Log Level"
          description="Minimum log level to record"
          value={config.LOG_LEVEL || 'INFO'}
          onChange={(v) => updateField('LOG_LEVEL', v)}
          type="select"
          options={['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']}
        />
      </ConfigSection>
    </div>
  );
}

// Reusable Components
function ConfigSection({ title, icon, children }) {
  return (
    <div style={{
      marginBottom: '32px',
      paddingBottom: '24px',
      borderBottom: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function ConfigField({ label, description, value, onChange, placeholder, type = 'text', fullWidth = false, options = [] }) {
  const fieldStyle = {
    width: fullWidth ? '100%' : 'auto',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: type === 'password' ? 'monospace' : 'inherit'
  };

  return (
    <div style={{ flex: fullWidth ? '1 1 100%' : '1' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '6px'
      }}>
        {label}
      </label>
      
      {type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={fieldStyle}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={fieldStyle}
        />
      )}
      
      {description && (
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: '1.4'
        }}>
          {description}
        </p>
      )}
    </div>
  );
}
