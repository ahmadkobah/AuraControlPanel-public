import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { token } = useAuth();
  const [services, setServices] = useState(null);
  const [tierStatus, setTierStatus] = useState(null);
  const [companyMetrics, setCompanyMetrics] = useState(null);

  useEffect(() => {
    // Fetch services status
    fetch('http://localhost:4000/status/services', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setServices)
      .catch(console.error);

    // Fetch tier status
    fetch('http://localhost:4000/admin/tier-status', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setTierStatus)
      .catch(console.error);

    // Fetch company metrics
    fetch('http://localhost:4000/proxy/companies', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const companies = data.companies || [];
        const metrics = {
          total: companies.length,
          byTier: {
            basic: companies.filter(c => c.tier === 'basic').length,
            plus: companies.filter(c => c.tier === 'plus').length,
            pro: companies.filter(c => c.tier === 'pro').length
          },
          totalRevenue: companies.reduce((sum, c) => {
            const prices = { basic: 0, plus: 99, pro: 299 };
            return sum + (prices[c.tier] || 0);
          }, 0)
        };
        setCompanyMetrics(metrics);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div>
      <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#1e293b' }}>Dashboard</h1>
      <p style={{ margin: '0 0 32px 0', color: '#64748b' }}>System overview and health status</p>

      {/* Company Metrics Section */}
      {companyMetrics && (
        <div style={{ marginBottom: '32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700' }}>📊 Company Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Companies</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{companyMetrics.total}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>🥉 Basic Tier</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{companyMetrics.byTier.basic}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>🥈 Plus Tier</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{companyMetrics.byTier.plus}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>🥇 Pro Tier</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>{companyMetrics.byTier.pro}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Monthly Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>${companyMetrics.totalRevenue.toLocaleString()}</div>
            </div>
          </div>
          {companyMetrics.byTier.basic > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '14px' }}>
              💡 <strong>{companyMetrics.byTier.basic}</strong> companies on Basic tier could generate <strong>${(companyMetrics.byTier.basic * 99).toLocaleString()}/mo</strong> if upgraded to Plus
            </div>
          )}
        </div>
      )}

      {/* Hardware Monitor - Full Width Vertical Layout */}
      <div style={{ marginBottom: '32px' }}>
        <HardwareMonitorCard data={services?.services?.hardware} />
      </div>

      {/* 5 Cards Grid: 3 Tier Cards + 2 Service Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Tier Cards */}
        {tierStatus && (
          <>
            <TierCard tier="basic" title="Basic Tier (Tier 1)" data={tierStatus.basic} />
            <TierCard tier="plus" title="Plus Tier (Tier 2)" data={tierStatus.plus} />
            <TierCard tier="pro" title="Pro Tier (Tier 3)" data={tierStatus.pro} />
          </>
        )}
        
        {/* Aura Backend Card */}
        <ServiceCard title="Aura Backend" data={services?.services?.backend} />
        
        {/* AI Service Card */}
        <ServiceCard title="AI Service" data={services?.services?.ai} />
      </div>
    </div>
  );
}

function ServiceCard({ title, data, compact }) {
  const isHealthy = data && !data.error;
  
  // Compact mode for split card layout
  if (compact) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569' }}>{title}</h3>
          <span style={{
            padding: '3px 10px',
            background: isHealthy ? '#d1fae5' : '#fee2e2',
            color: isHealthy ? '#065f46' : '#991b1b',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {isHealthy ? '✓' : '✗'}
          </span>
        </div>
        
        {data && (
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
            {title === 'Aura Backend' && (
              <>
                <div>{data.service}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '4px', color: '#94a3b8' }}>{data.endpoint}</div>
              </>
            )}
            {title === 'AI Service' && (
              <>
                <div>{data.message}</div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>{data.models_loaded ? '✓ Models' : '✗ Models'}</span>
                  <span>{data.gpu_available ? '✓ GPU' : '✗ GPU'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '16px',
      borderRadius: '10px',
      border: `2px solid ${isHealthy ? '#fbbf24' : '#ef4444'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569' }}>{title}</h3>
        <span style={{
          padding: '3px 10px',
          background: isHealthy ? '#d1fae5' : '#fee2e2',
          color: isHealthy ? '#065f46' : '#991b1b',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {isHealthy ? '✓' : '✗'}
        </span>
      </div>
      
      {data && (
        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
          {title === 'Aura Backend' && (
            <>
              <div>{data.service}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '4px', color: '#94a3b8' }}>{data.endpoint}</div>
            </>
          )}
          {title === 'AI Service' && (
            <>
              <div>{data.message}</div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '12px' }}>
                <span>{data.models_loaded ? '✓ Models' : '✗ Models'}</span>
                <span>{data.gpu_available ? '✓ GPU' : '✗ GPU'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HardwareMonitorCard({ data }) {
  const isHealthy = data && !data.error;
  
  // Helper to format percentages with color and gradient
  const getUsageColor = (percent) => {
    if (percent >= 90) return { solid: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
    if (percent >= 70) return { solid: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
    if (percent >= 50) return { solid: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' };
    return { solid: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' };
  };
  
  // Helper to format temperature with color
  const getTempColor = (temp) => {
    if (temp >= 80) return { solid: '#ef4444', bg: '#fee2e2' };
    if (temp >= 70) return { solid: '#f59e0b', bg: '#fed7aa' };
    if (temp >= 60) return { solid: '#fbbf24', bg: '#fef3c7' };
    return { solid: '#10b981', bg: '#d1fae5' };
  };
  
  // Circular gauge component
  const CircularGauge = ({ value, max = 100, size = 100, label, color, unit = '%' }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 38;
    const offset = circumference - (percentage / 100) * circumference;
    const colors = getUsageColor(percentage);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="38"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="38"
            fill="none"
            stroke={colors.solid}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          {/* Center text */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy="0.3em"
            style={{
              fontSize: '20px',
              fontWeight: '700',
              fill: colors.solid,
              transform: 'rotate(90deg)',
              transformOrigin: 'center'
            }}
          >
            {value?.toFixed(0) || '0'}{unit}
          </text>
        </svg>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textAlign: 'center' }}>
          {label}
        </div>
      </div>
    );
  };
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '24px',
      borderRadius: '16px',
      border: `2px solid ${isHealthy ? '#fbbf24' : '#ef4444'}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
            🖥️ Hardware Monitor
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Basic Tier Infrastructure</div>
        </div>
        <span style={{
          padding: '6px 14px',
          background: isHealthy ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          color: isHealthy ? '#065f46' : '#991b1b',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {isHealthy ? '✓ ACTIVE' : '✗ OFFLINE'}
        </span>
      </div>
      
      {!isHealthy ? (
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
          borderRadius: '12px', 
          fontSize: '14px', 
          color: '#991b1b',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          ⚠️ Hardware monitoring unavailable
        </div>
      ) : (
        <div>
          {/* Gauges Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
            gap: '20px',
            marginBottom: '20px',
            padding: '20px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px'
          }}>
            {data.cpu && (
              <CircularGauge 
                value={data.cpu.usage} 
                label="CPU Usage"
                color={getUsageColor(data.cpu.usage)}
              />
            )}
            {data.gpu && data.gpu.usage !== undefined && (
              <CircularGauge 
                value={data.gpu.usage} 
                label="GPU Usage"
                color={getUsageColor(data.gpu.usage)}
              />
            )}
            {data.system && (
              <CircularGauge 
                value={data.system.ram_percent} 
                label="RAM Usage"
                color={getUsageColor(data.system.ram_percent)}
              />
            )}
          </div>
          
          {/* Detailed Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* CPU Details */}
            {data.cpu && (
              <div style={{ 
                padding: '16px', 
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '24px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    borderRadius: '8px'
                  }}>💻</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Processor</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {data.cpu.cores} Cores / {data.cpu.threads} Threads
                    </div>
                  </div>
                </div>
                
                {data.cpu.temperature && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: getTempColor(data.cpu.temperature).bg,
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Temperature</span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: getTempColor(data.cpu.temperature).solid 
                    }}>
                      {data.cpu.temperature.toFixed(1)}°C
                    </span>
                  </div>
                )}
                
                {data.cpu.frequency_mhz && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#64748b',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px'
                  }}>
                    Clock: {data.cpu.frequency_mhz.toFixed(0)} MHz
                  </div>
                )}
              </div>
            )}
            
            {/* GPU Details */}
            {data.gpu && data.gpu.available && (
              <div style={{ 
                padding: '16px', 
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '24px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                    borderRadius: '8px'
                  }}>🎮</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Graphics</div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {data.gpu.name || 'GPU'}
                    </div>
                  </div>
                </div>
                
                {data.gpu.temperature && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: getTempColor(data.gpu.temperature).bg,
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Temperature</span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: getTempColor(data.gpu.temperature).solid 
                    }}>
                      {data.gpu.temperature.toFixed(1)}°C
                    </span>
                  </div>
                )}
                
                {data.gpu.memory && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#64748b',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>VRAM</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      {typeof data.gpu.memory.used === 'number' ? data.gpu.memory.used.toFixed(1) : parseFloat(data.gpu.memory.used || 0).toFixed(1)} / {typeof data.gpu.memory.total === 'number' ? data.gpu.memory.total.toFixed(1) : parseFloat(data.gpu.memory.total || 0).toFixed(1)} GB
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* System Footer */}
          {data.system && (
            <div style={{ 
              marginTop: '16px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: '#4338ca'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💾</span>
                <span>
                  RAM: {typeof data.system.ram_used === 'number' ? data.system.ram_used.toFixed(1) : parseFloat(data.system.ram_used || 0).toFixed(1)} / {typeof data.system.ram_total === 'number' ? data.system.ram_total.toFixed(1) : parseFloat(data.system.ram_total || 0).toFixed(1)} GB
                </span>
              </div>
              {data.system.platform && (
                <div style={{ 
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}>
                  {data.system.platform} {data.system.platform_release}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierCard({ tier, title, data }) {
  const isRunning = data?.status === 'running';
  const isUnderDevelopment = data?.status === 'under_development';
  
  const tierColors = {
    basic: { primary: '#10b981', light: '#f0fdf4', text: '#15803d', badge: '#bbf7d0' },
    plus: { primary: '#3b82f6', light: '#eff6ff', text: '#1e40af', badge: '#bfdbfe' },
    pro: { primary: '#8b5cf6', light: '#faf5ff', text: '#6b21a8', badge: '#e9d5ff' }
  };
  
  const colors = tierColors[tier] || tierColors.basic;
  
  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: `2px solid ${colors.primary}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>
          {title}
        </h3>
        <span style={{
          padding: '4px 12px',
          background: isRunning ? '#d1fae5' : isUnderDevelopment ? '#fef3c7' : '#fee2e2',
          color: isRunning ? '#065f46' : isUnderDevelopment ? '#92400e' : '#991b1b',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {isRunning ? '✓ Running' : isUnderDevelopment ? '🚧 Under Development' : '✗ Not Running'}
        </span>
      </div>

      {/* Service URL */}
      {data?.serviceUrl && (
        <div style={{ marginBottom: '12px', padding: '8px', background: colors.light, borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Service URL</div>
          <div style={{ fontSize: '13px', fontFamily: 'monospace', color: colors.text, fontWeight: '500' }}>
            {data.serviceUrl}
          </div>
        </div>
      )}

      {/* Models */}
      {data?.models && Array.isArray(data.models) && data.models.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
            AI Models:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.models.map((model, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                background: '#f8fafc',
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <span style={{ fontWeight: '500', color: '#1e293b' }}>{model.name || model}</span>
                <span style={{
                  padding: '2px 8px',
                  background: model.loaded ? '#d1fae5' : '#fee2e2',
                  color: model.loaded ? '#065f46' : '#991b1b',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {model.loaded ? '● Loaded' : '○ Not Loaded'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {data?.features && data.features.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
            Features:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.features.map((feature, i) => (
              <span key={i} style={{
                padding: '4px 10px',
                background: colors.light,
                color: colors.text,
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Companies Using */}
      {data?.companiesUsing !== undefined && (
        <div style={{ marginTop: '12px', padding: '8px', background: colors.light, borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Companies: </span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
            {data.companiesUsing}
          </span>
        </div>
      )}

      {/* Under Development Message */}
      {isUnderDevelopment && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          🚧 This tier is currently under development. Models and features will be available soon.
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#64748b' }}>{label}</div>
    </div>
  );
}
