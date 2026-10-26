import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function Statistics() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('month'); // day, week, month, year, all
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    loadStatistics();
    loadCompanies();
  }, [period, selectedCompany]);

  const loadCompanies = async () => {
    try {
      const api = createApi(token);
      const res = await api.get('/proxy/companies');
      if (res.companies) setCompanies(res.companies);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const api = createApi(token);
      const res = await api.get(`/admin/statistics?period=${period}&companyId=${selectedCompany}`);
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      alert('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>No statistics available</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>📊 Statistics Dashboard</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            System-wide analytics and insights
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={loadStatistics}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard title="Total Users" value={stats.overview.totalUsers} icon="👥" color="#3b82f6" />
        <StatCard title="Total Documents" value={stats.overview.totalDocuments} icon="📄" color="#8b5cf6" />
        <StatCard title="Total Companies" value={stats.overview.totalCompanies} icon="🏢" color="#06b6d4" />
        <StatCard title="Total Departments" value={stats.overview.totalDepartments} icon="🏢" color="#10b981" />
      </div>

      {/* Tier Distribution */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Company Tier Distribution</h2>
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <TierBar label="Basic" count={stats.tierDistribution.basic} total={stats.overview.totalCompanies} color="#94a3b8" />
            <TierBar label="Plus" count={stats.tierDistribution.plus} total={stats.overview.totalCompanies} color="#667eea" />
            <TierBar label="Pro" count={stats.tierDistribution.pro} total={stats.overview.totalCompanies} color="#fbbf24" />
            <TierBar label="No Tier" count={stats.tierDistribution.none} total={stats.overview.totalCompanies} color="#e2e8f0" />
          </div>
          <PieChart data={stats.tierDistribution} />
        </div>
      </div>

      {/* Document Statistics */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Document Activity</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b' }}>By Status</h3>
            <BarChart data={stats.documents.byStatus} />
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b' }}>By Classification</h3>
            <BarChart data={stats.documents.byClassification} />
          </div>
        </div>
      </div>

      {/* AI Service Statistics */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>AI Service Usage</h2>
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
            <MetricBox label="Total Requests" value={stats.aiServices.totalRequests} color="#3b82f6" />
            <MetricBox label="Success Rate" value={`${stats.aiServices.successRate}%`} color="#10b981" />
            <MetricBox label="Avg Response Time" value={`${stats.aiServices.avgResponseTime}ms`} color="#f59e0b" />
          </div>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>Requests by Endpoint</h4>
          <BarChart data={stats.aiServices.byEndpoint} horizontal />
        </div>
      </div>

      {/* AI Processing Statistics - Tables & Signatures */}
      {stats.aiProcessing && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>📊 AI Processing Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Table Extraction Stats */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '24px', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Table Extraction
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.aiProcessing.tablesExtracted}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Tables Extracted</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: '700' }}>{stats.aiProcessing.avgTablesPerDoc}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Avg per Document</div>
                </div>
              </div>
              {/* Extraction Source Breakdown */}
              {stats.aiProcessing.byExtractionSource && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Extraction Method</div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>📋 PPStructure</span>
                        <span>{stats.aiProcessing.byExtractionSource.ppstructure || 0}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          background: '#4ade80',
                          width: `${stats.aiProcessing.tablesExtracted > 0 
                            ? ((stats.aiProcessing.byExtractionSource.ppstructure || 0) / stats.aiProcessing.tablesExtracted) * 100 
                            : 0}%`
                        }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>🦙 LLaMA Text</span>
                        <span>{stats.aiProcessing.byExtractionSource.llama_text || 0}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          background: '#fbbf24',
                          width: `${stats.aiProcessing.tablesExtracted > 0 
                            ? ((stats.aiProcessing.byExtractionSource.llama_text || 0) / stats.aiProcessing.tablesExtracted) * 100 
                            : 0}%`
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Signature & Processing Stats */}
            <div style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✍️</span> Detection & Processing
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: '#16a34a' }}>{stats.aiProcessing.signaturesDetected}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Signatures Detected</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: '#eff6ff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: '#2563eb' }}>{stats.aiProcessing.totalProcessed}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Docs Processed</div>
                </div>
              </div>
              
              {/* Document Types Distribution */}
              {stats.aiProcessing.byDocumentType && Object.keys(stats.aiProcessing.byDocumentType).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#64748b' }}>Top Document Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(stats.aiProcessing.byDocumentType)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([type, count]) => (
                        <span key={type} style={{
                          padding: '4px 10px',
                          background: '#f1f5f9',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#475569',
                          fontWeight: '500'
                        }}>
                          {type}: {count}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Activity */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>User Activity</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b' }}>Active Users</h3>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#667eea', textAlign: 'center', marginBottom: '8px' }}>
              {stats.users.activeUsers}
            </div>
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              {stats.users.activePercentage}% of total users
            </div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b' }}>By Role</h3>
            <BarChart data={stats.users.byRole} />
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Top Performers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <TopList title="Most Active Companies" items={stats.topPerformers.companies} />
          <TopList title="Most Active Departments" items={stats.topPerformers.departments} />
          <TopList title="Most Active Users" items={stats.topPerformers.users} />
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: '24px' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: color }}>{value.toLocaleString()}</div>
    </div>
  );
}

function TierBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
        <span style={{ fontWeight: '500' }}>{label}</span>
        <span style={{ color: '#64748b' }}>{count}</span>
      </div>
      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, width: `${percentage}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function PieChart({ data }) {
  const total = data.basic + data.plus + data.pro + data.none;
  if (total === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No data</div>;

  const colors = ['#94a3b8', '#667eea', '#fbbf24', '#e2e8f0'];
  const values = [data.basic, data.plus, data.pro, data.none];
  const labels = ['Basic', 'Plus', 'Pro', 'None'];
  
  let currentAngle = 0;
  const segments = values.map((value, i) => {
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return { label: labels[i], value, percentage, color: colors[i], angle, startAngle };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '24px' }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#f1f5f9" strokeWidth="40" />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const largeArc = seg.angle > 180 ? 1 : 0;
          const startRad = (seg.startAngle - 90) * Math.PI / 180;
          const endRad = (seg.startAngle + seg.angle - 90) * Math.PI / 180;
          const x1 = 100 + 80 * Math.cos(startRad);
          const y1 = 100 + 80 * Math.sin(startRad);
          const x2 = 100 + 80 * Math.cos(endRad);
          const y2 = 100 + 80 * Math.sin(endRad);
          
          return (
            <path
              key={i}
              d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={seg.color}
            />
          );
        })}
      </svg>
      
      <div style={{ flex: 1 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: seg.color }} />
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              {seg.label}: <strong>{seg.value}</strong> ({seg.percentage.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, horizontal = false }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No data</div>;

  const maxValue = Math.max(...entries.map(([_, v]) => v));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {entries.map(([key, value], i) => {
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
        const color = colors[i % colors.length];

        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '120px', fontSize: '14px', color: '#64748b', textAlign: 'right' }}>
              {key}
            </div>
            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', background: color, width: `${percentage}%`, transition: 'width 0.3s' }} />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '600', color: percentage > 50 ? 'white' : '#1e293b' }}>
                {value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: '700', color }}>{value}</div>
    </div>
  );
}

function TopList({ title, items }) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#64748b' }}>{title}</h3>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>No data</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#cd7f32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#667eea' }}>{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
