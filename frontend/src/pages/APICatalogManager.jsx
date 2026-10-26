import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function APICatalogManager() {
  const { token } = useAuth();
  const api = useMemo(() => createApi(token), [token]);
  
  const [endpoints, setEndpoints] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [filterTier, setFilterTier] = useState('basic');
  const [tierRateLimits, setTierRateLimits] = useState({
    basic: { requestsPerMinute: 10, requestsPerDay: 1000 },
    plus: { requestsPerMinute: 50, requestsPerDay: 10000 },
    pro: { requestsPerMinute: -1, requestsPerDay: -1 }
  });
  const [showOnlyDeployed, setShowOnlyDeployed] = useState(true);
  
  const [healthChecking, setHealthChecking] = useState({});
  const [editingUrls, setEditingUrls] = useState(null);
  const [urlForm, setUrlForm] = useState({ basic: '', plus: '', pro: '' });
  const [error, setError] = useState(null);
  
  // Auto-refresh settings
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // minutes
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoDiscoveryEnabled, setAutoDiscoveryEnabled] = useState(true);

  // Auto-refresh catalog every N minutes
  useEffect(() => {
    loadCatalog();
  }, [selectedService, selectedCategory, selectedFeature, filterTier, showOnlyDeployed]);
  
  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const intervalMs = refreshInterval * 60 * 1000;
    const timer = setInterval(() => {
      console.log(`🔄 Auto-refreshing catalog (every ${refreshInterval} min)`);
      loadCatalog();
    }, intervalMs);
    
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshInterval, selectedService, selectedCategory, selectedFeature, filterTier, showOnlyDeployed]);
  
  // Auto-discovery of new APIs every 15 minutes
  useEffect(() => {
    if (!autoDiscoveryEnabled) return;
    
    const discoveryInterval = 15 * 60 * 1000; // 15 minutes
    const timer = setInterval(() => {
      console.log('🔍 Auto-discovering new APIs...');
      autoDiscoverAPIs();
    }, discoveryInterval);
    
    return () => clearInterval(timer);
  }, [autoDiscoveryEnabled]);

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedService !== 'all') params.append('service', selectedService);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedFeature !== 'all') params.append('feature', selectedFeature);
      if (showOnlyDeployed) {
        params.append('tier', filterTier);
        params.append('isDeployed', 'true');
      }
      
      const data = await api.get(`/admin/api-catalog?${params.toString()}`);
      setEndpoints(data.endpoints || []);
      setGrouped(data.grouped || {});
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Load catalog failed:', e);
      setError(e.message || 'Failed to load API catalog. The endpoint may not exist yet or the backend is not running.');
      setEndpoints([]);
      setGrouped({});
    } finally {
      setLoading(false);
    }
  }
  
  async function autoDiscoverAPIs() {
    try {
      console.log('🔍 Checking for new APIs in services...');
      const data = await api.post('/admin/discover-new-apis');
      
      if (data.newEndpoints > 0) {
        console.log(`✅ Found ${data.newEndpoints} new APIs!`);
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 600;
        `;
        notification.textContent = `🎉 Discovered ${data.newEndpoints} new API${data.newEndpoints > 1 ? 's' : ''}!`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        
        // Reload catalog to show new APIs
        loadCatalog();
      } else {
        console.log('ℹ️ No new APIs found');
      }
    } catch (e) {
      console.error('Auto-discovery failed:', e);
    }
  }

  async function seedCatalog() {
    if (!confirm('This will populate the database with all 133 API endpoints. Continue?')) return;
    
    setLoading(true);
    try {
      const data = await api.post('/admin/seed-api-catalog');
      alert(`Seeded successfully!\nCreated: ${data.results.created}\nUpdated: ${data.results.updated}`);
      loadCatalog();
    } catch (e) {
      alert('Seed failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkHealth(endpointId) {
    setHealthChecking(prev => ({ ...prev, [endpointId]: true }));
    try {
      const data = await api.post(`/admin/api-catalog/${endpointId}/health-check`);
      alert(`Health Check Results:\n\n` +
        `Basic: ${data.health.basic.status} (${data.health.basic.latency || 'N/A'}ms)\n` +
        `Plus: ${data.health.plus.status} (${data.health.plus.latency || 'N/A'}ms)\n` +
        `Pro: ${data.health.pro.status} (${data.health.pro.latency || 'N/A'}ms)`
      );
      loadCatalog();
    } catch (e) {
      alert('Health check failed: ' + e.message);
    } finally {
      setHealthChecking(prev => ({ ...prev, [endpointId]: false }));
    }
  }

  async function bulkHealthCheck() {
    if (!confirm('Check health of all deployed endpoints across ALL tiers? This may take a while.')) return;
    
    setLoading(true);
    try {
      const data = await api.post('/admin/api-catalog/health-check-all', {
        services: selectedService !== 'all' ? [selectedService] : null,
        tiers: ['basic', 'plus', 'pro'] // Test all tiers, not just the selected filter
      });
      alert(`Health Check Complete!\n\n` +
        `Total: ${data.results.total}\n` +
        `Checked: ${data.results.checked}\n` +
        `Healthy: ${data.results.healthy}\n` +
        `Degraded: ${data.results.degraded}\n` +
        `Down: ${data.results.down}\n` +
        `Not Deployed: ${data.results.not_deployed}`
      );
      loadCatalog();
    } catch (e) {
      alert('Bulk health check failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function openEditUrls(endpoint) {
    setEditingUrls(endpoint);
    setUrlForm({
      basic: endpoint.tierUrls?.basic || '',
      plus: endpoint.tierUrls?.plus || '',
      pro: endpoint.tierUrls?.pro || ''
    });
  }

  async function saveUrls() {
    try {
      await api.put(`/admin/api-catalog/${editingUrls.id}/tier-urls`, urlForm);
      alert('Tier URLs updated successfully!');
      setEditingUrls(null);
      loadCatalog();
    } catch (e) {
      alert('Update failed: ' + e.message);
    }
  }

  const services = [...new Set(endpoints.map(e => e.service))];
  const categories = [...new Set(endpoints.map(e => e.category))];
  const features = [...new Set(endpoints.flatMap(e => e.features || []))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>📚 API Catalog Manager</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Complete inventory of <span style={{ fontWeight: '600', color: '#667eea' }}>{endpoints.length}</span> API endpoints across all services
            {lastRefresh && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#94a3b8' }}>
                • Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={bulkHealthCheck}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#cbd5e1' : '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Test All APIs
          </button>
          <button
            onClick={autoDiscoverAPIs}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#cbd5e1' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Force Discovery
          </button>
          <button
            onClick={seedCatalog}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#cbd5e1' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'none',
              gap: '8px'
            }}
          >
            <span>🌱</span>
            <span>Seed Catalog</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Filters</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', background: 'white' }}
            >
              <option value="all">All Services</option>
              {services.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
            
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', background: 'white' }}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
            
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Feature</label>
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', background: 'white' }}
            >
              <option value="all">All Features</option>
              {features.map(f => (
                <option key={f} value={f}>{f.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
            
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Tier</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', background: 'white' }}
            >
              <option value="basic">🟢 Basic</option>
              <option value="plus">🔵 Plus</option>
              <option value="pro">🟣 Pro</option>
            </select>
          </div>
            
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={showOnlyDeployed}
                onChange={(e) => setShowOnlyDeployed(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Only Deployed</span>
            </label>
          </div>
        </div>
      </div>

      {/* Auto-Refresh Settings Panel */}
      <div style={{ background: 'linear-gradient(to right, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>🔄 Auto-Refresh</span>
            </label>
            
            {autoRefreshEnabled && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
              </select>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={autoDiscoveryEnabled}
                onChange={(e) => setAutoDiscoveryEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>🔍 Auto-Discovery (15 min)</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {lastRefresh && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </span>
                {autoRefreshEnabled && (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Next in {refreshInterval} min
                  </span>
                )}
              </div>
            )}
            <button
              onClick={loadCatalog}
              disabled={loading}
              style={{ padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', opacity: loading ? 0.6 : 1 }}
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Endpoint Cards */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#991b1b' }}>Error Loading Catalog</h3>
          </div>
          <p style={{ margin: '0 0 12px 36px', fontSize: '14px', color: '#7f1d1d' }}>{error}</p>
          <div style={{ marginLeft: '36px' }}>
            <button
              onClick={seedCatalog}
              style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
            >
              🌱 Click here to seed the catalog database
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading catalog...</p>
        </div>
      ) : endpoints.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>No Endpoints Found</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
            The API catalog is empty. Click "Seed Catalog" to populate it with 133 endpoints.
          </p>
          <button
            onClick={seedCatalog}
            style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            🌱 Seed Catalog Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.keys(grouped).map(service => (
            <div key={service} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                  {service.replace('projectena_backend', 'aura_backend').replace('_', ' ').toUpperCase()}
                </h2>
                <span style={{ padding: '4px 12px', background: '#ede9fe', color: '#6d28d9', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                  {Object.values(grouped[service]).flat().length} endpoints
                </span>
              </div>
            
              <div style={{ padding: '20px' }}>
                {Object.keys(grouped[service]).map(category => (
                  <div key={category} style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {category.replace('_', ' ')}
                      </h3>
                      <span style={{ padding: '2px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                        {grouped[service][category].length}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                      {grouped[service][category].map(endpoint => (
                        <div
                          key={endpoint.id}
                          style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{endpoint.name}</h4>
                              <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#4f46e5', background: '#eef2ff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e0e7ff', display: 'inline-block', marginBottom: '8px' }}>
                                {endpoint.method} {endpoint.path}
                              </code>
                              
                              {/* 3 Tier Health Status Badges */}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                {['basic', 'plus', 'pro'].map(tier => {
                                  const status = endpoint.healthStatus?.[tier] || 'unknown';
                                  const latency = endpoint.healthLatency?.[tier];
                                  
                                  let bgColor = '#94a3b8'; // gray (unknown)
                                  let textColor = '#ffffff';
                                  
                                  if (status === 'healthy') {
                                    bgColor = '#10b981'; // green
                                  } else if (status === 'down') {
                                    bgColor = '#ef4444'; // red
                                  } else if (status === 'degraded') {
                                    bgColor = '#f59e0b'; // yellow
                                    textColor = '#000000';
                                  } else if (status === 'not_deployed') {
                                    bgColor = '#e2e8f0'; // light gray
                                    textColor = '#64748b'; // dark gray text
                                  }
                                  
                                  return (
                                    <div
                                      key={tier}
                                      style={{
                                        background: bgColor,
                                        color: textColor,
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        minWidth: '60px',
                                        justifyContent: 'center'
                                      }}
                                      title={`${tier}: ${status}${latency ? ` (${latency}ms)` : ''}`}
                                    >
                                      <span>{tier}</span>
                                      {latency && <span style={{ opacity: 0.8, fontSize: '9px' }}>({latency}ms)</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => checkHealth(endpoint.id)}
                              disabled={healthChecking[endpoint.id]}
                              style={{ 
                                padding: '6px 12px',
                                background: healthChecking[endpoint.id] ? '#cbd5e1' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: healthChecking[endpoint.id] ? 'wait' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}
                              title="Test endpoint health across all tiers"
                            >
                              {healthChecking[endpoint.id] ? 'Testing...' : 'Test'}
                            </button>
                          </div>
                          
                          {/* Description */}
                          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{endpoint.description}</p>
                          
                          {/* Features */}
                          {endpoint.features && endpoint.features.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                              {endpoint.features.slice(0, 3).map(feat => (
                                <span
                                  key={feat}
                                  style={{ padding: '3px 8px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}
                                >
                                  {feat.replace('_', ' ')}
                                </span>
                              ))}
                              {endpoint.features.length > 3 && (
                                <span style={{ padding: '3px 8px', background: '#e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: '500', borderRadius: '4px' }}>
                                  +{endpoint.features.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                            <button
                              onClick={() => openEditUrls(endpoint)}
                              style={{ 
                                flex: 1, 
                                padding: '8px 12px', 
                                background: '#667eea', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                fontSize: '13px', 
                                fontWeight: '600' 
                              }}
                            >
                              📝 Edit URLs
                            </button>
                            <button
                              style={{ 
                                padding: '8px 12px', 
                                background: '#f1f5f9', 
                                color: '#475569', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '6px', 
                                fontSize: '13px', 
                                fontWeight: '500' 
                              }}
                              title="Estimated latency"
                            >
                              ⏱️ {endpoint.estimatedLatency}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit URLs Modal */}
      {editingUrls && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEditingUrls(null)}
        >
          <div 
            style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
              📝 Edit Tier URLs
            </h2>
            <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#667eea' }}>
              {editingUrls.name}
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>
              Configure tier-specific base URLs for this endpoint
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  🟢 Basic Tier URL
                </label>
                <input
                  type="text"
                  value={urlForm.basic}
                  onChange={(e) => setUrlForm({ ...urlForm, basic: e.target.value })}
                  placeholder="http://localhost:9000"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                  Full URL: <span style={{ color: '#10b981', fontWeight: '600' }}>{urlForm.basic}{editingUrls.path}</span>
                </p>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  🔵 Plus Tier URL
                </label>
                <input
                  type="text"
                  value={urlForm.plus}
                  onChange={(e) => setUrlForm({ ...urlForm, plus: e.target.value })}
                  placeholder="http://localhost:9001"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                  Full URL: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{urlForm.plus}{editingUrls.path}</span>
                </p>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  🟣 Pro Tier URL
                </label>
                <input
                  type="text"
                  value={urlForm.pro}
                  onChange={(e) => setUrlForm({ ...urlForm, pro: e.target.value })}
                  placeholder="http://localhost:9002"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                  Full URL: <span style={{ color: '#9333ea', fontWeight: '600' }}>{urlForm.pro}{editingUrls.path}</span>
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setEditingUrls(null)}
                style={{ padding: '10px 20px', background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={saveUrls}
                style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                💾 Save URLs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
