import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApi } from '../lib/api';

export default function Logs() {
  const { token } = useAuth();
  const api = createApi(token);
  const [selectedService, setSelectedService] = useState('ai-service');
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const services = [
    { id: 'aura', name: 'Aura Backend' },
    { id: 'ai-service', name: 'AI Service' },
    { id: 'control-panel', name: 'Control Panel' }
  ];

  useEffect(() => {
    loadLogs();
    return () => {
      stopStreaming();
    };
  }, [selectedService]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogs = async () => {
    try {
      const data = await api.get(`/admin/logs/${selectedService}?lines=200`);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs([`Error loading logs: ${error.message}`]);
    }
  };

  const startStreaming = () => {
    stopStreaming();
    setIsStreaming(true);

    const token = localStorage.getItem('token');
    // EventSource doesn't support custom headers, so we pass token as query param
    const eventSource = new EventSource(
      `http://localhost:4000/admin/logs/${selectedService}/stream?token=${encodeURIComponent(token)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log' && data.line) {
          setLogs(prev => [...prev, data.line]);
        }
      } catch (err) {
        console.error('Failed to parse log event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      stopStreaming();
    };

    eventSourceRef.current = eventSource;
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  const clearLogs = async () => {
    if (!confirm(`Clear all logs for ${selectedService}?`)) return;
    try {
      await api.del(`/admin/logs/${selectedService}`);
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const getLogColor = (logLine) => {
    if (!logLine) return '#e0e0e0';
    const lower = logLine.toLowerCase();
    if (lower.includes('error') || lower.includes('❌')) return '#f44336';
    if (lower.includes('warning') || lower.includes('⚠️')) return '#ff9800';
    if (lower.includes('success') || lower.includes('✅')) return '#4caf50';
    if (lower.includes('info') || lower.includes('ℹ️')) return '#2196f3';
    return '#e0e0e0';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px' }}>Service Logs</h2>

        {/* Controls */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Service Selector */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Service:
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                onClick={loadLogs}
                style={{
                  padding: '8px 16px',
                  background: '#2196f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Refresh
              </button>
              
              <button
                onClick={isStreaming ? stopStreaming : startStreaming}
                style={{
                  padding: '8px 16px',
                  background: isStreaming ? '#ff9800' : '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {isStreaming ? '⏸️ Stop Stream' : '▶️ Start Stream'}
              </button>

              <button
                onClick={clearLogs}
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ Clear
              </button>
            </div>

            {/* Auto-scroll Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Logs Display */}
        <div style={{
          background: '#1e1e1e',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxHeight: '70vh',
          overflowY: 'auto',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              No logs available
            </div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                style={{
                  color: getLogColor(line),
                  marginBottom: '4px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {line}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Stats */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fff',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#666'
        }}>
          Total lines: {logs.length} | Service: {services.find(s => s.id === selectedService)?.name} | 
          {isStreaming ? ' 🔴 Live streaming' : ' ⚫ Static'}
        </div>
      </div>
    </div>
  );
}
