import { useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaDatabase, FaExclamationTriangle, FaServer, FaShieldAlt, FaSync, FaTimesCircle } from 'react-icons/fa';
import { systemStatusService } from '../services/firebaseService';
import { Card } from './UI';

export default function CourseUpdateAdmin() {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial status
  useEffect(() => {
    loadSystemStatus();
    // Refresh data every 30 seconds
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemStatus = async () => {
    try {
      setError(null);
      const [updateData, healthData] = await Promise.all([
        systemStatusService.getUpdateStatus(),
        systemStatusService.getHealthStatus()
      ]);
      
      setUpdateStatus(updateData);
      setHealthStatus(healthData);
    } catch (error) {
      console.error('Error loading system status:', error);
      setError('Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualUpdate = async () => {
    setIsUpdating(true);
    try {
      console.log('Triggering manual course update...');
      
      // Request manual update in Firebase
      await systemStatusService.requestManualUpdate();
      
      // Refresh status
      await loadSystemStatus();
      
      // Note: In a production environment, this would trigger a Cloud Function
      // that runs the actual update script. For now, we just mark it as requested.
      
    } catch (error) {
      console.error('Manual update request failed:', error);
      setError('Failed to request manual update');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'healthy':
        return 'status-success';
      case 'FAILED':
      case 'unhealthy':
        return 'status-error';
      case 'RUNNING':
        return 'status-running';
      default:
        return 'status-warning';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'healthy':
        return <FaCheckCircle />;
      case 'FAILED':
      case 'unhealthy':
        return <FaTimesCircle />;
      case 'RUNNING':
        return <FaSync className="animate-spin" />;
      default:
        return <FaExclamationTriangle />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      {error && (
        <div className="error-banner">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* System Health Overview */}
      <Card 
        title="System Health" 
        icon={<FaShieldAlt />}
        className="admin-status-card"
      >
        <div className="status-grid">
          <div className={`status-item ${getStatusColor(healthStatus?.overallStatus)}`}>
            <div className="status-icon">
              {getStatusIcon(healthStatus?.overallStatus)}
            </div>
            <div className="status-content">
              <h4>Overall Status</h4>
              <p>{healthStatus?.overallStatus || 'Unknown'}</p>
              <small>Last check: {formatTimeAgo(healthStatus?.timestamp)}</small>
            </div>
          </div>

          <div className="status-item">
            <div className="status-icon">
              <FaDatabase />
            </div>
            <div className="status-content">
              <h4>Total Courses</h4>
              <p>{healthStatus?.checks?.dataIntegrity?.totalCourses || 'N/A'}</p>
              <small>Data integrity: {healthStatus?.checks?.dataIntegrity?.status || 'Unknown'}</small>
            </div>
          </div>

          <div className="status-item">
            <div className="status-icon">
              <FaServer />
            </div>
            <div className="status-content">
              <h4>Firebase</h4>
              <p>{healthStatus?.checks?.firebase?.status || 'Unknown'}</p>
              <small>Database connectivity</small>
            </div>
          </div>

          <div className="status-item">
            <div className="status-icon">
              <FaClock />
            </div>
            <div className="status-content">
              <h4>Last Update</h4>
              <p>{formatTimeAgo(updateStatus?.lastUpdate)}</p>
              <small>Status: {updateStatus?.status || 'Unknown'}</small>
            </div>
          </div>
        </div>
      </Card>

      {/* Update Status Details */}
      <Card 
        title="Update Status" 
        icon={<FaSync />}
        className="admin-status-card"
      >
        <div className="update-status-content">
          <div className={`current-status ${getStatusColor(updateStatus?.status)}`}>
            <div className="status-header">
              <div className="status-icon">
                {getStatusIcon(updateStatus?.status)}
              </div>
              <div className="status-info">
                <h4>Current Status</h4>
                <p>{updateStatus?.status || 'Unknown'}</p>
              </div>
            </div>
            <div className="status-meta">
              <span>Last update: {updateStatus?.lastUpdate ? new Date(updateStatus.lastUpdate).toLocaleString() : 'Never'}</span>
              {updateStatus?.summary?.duration && (
                <span>Duration: {updateStatus.summary.duration}s</span>
              )}
            </div>
          </div>

          {updateStatus?.summary && (
            <div className="summary-section">
              <h4>Update Summary</h4>
              <div className="summary-grid">
                <div className="summary-item added">
                  <span className="summary-number">{updateStatus.summary.added || 0}</span>
                  <span className="summary-label">Added</span>
                </div>
                <div className="summary-item updated">
                  <span className="summary-number">{updateStatus.summary.updated || 0}</span>
                  <span className="summary-label">Updated</span>
                </div>
                <div className="summary-item removed">
                  <span className="summary-number">{updateStatus.summary.removed || 0}</span>
                  <span className="summary-label">Removed</span>
                </div>
                <div className="summary-item unchanged">
                  <span className="summary-number">{updateStatus.summary.unchanged || 0}</span>
                  <span className="summary-label">Unchanged</span>
                </div>
              </div>
            </div>
          )}

          {updateStatus?.error && (
            <div className="error-section">
              <h4>Error Details</h4>
              <p>{updateStatus.error}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Manual Controls */}
      <Card 
        title="Manual Controls" 
        icon={<FaSync />}
        className="admin-controls-card"
      >
        <div className="controls-content">
          <div className="controls-left">
            <button
              onClick={triggerManualUpdate}
              disabled={isUpdating}
              className={`button button--primary ${isUpdating ? 'button--loading' : ''}`}
            >
              {isUpdating ? (
                <>
                  <FaSync className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FaSync />
                  Trigger Manual Update
                </>
              )}
            </button>
          </div>
          
          <div className="controls-right">
            <div className="update-info">
              <p><strong>Next automatic update:</strong> Sunday 2:00 AM</p>
              <p><strong>Update frequency:</strong> Weekly from DePauw University website</p>
              <p><strong>Health checks:</strong> Daily at 3:00 AM</p>
            </div>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card 
        title="System Information" 
        className="admin-info-card"
      >
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Log Files:</span>
            <span className="info-value">/logs/course-updates.log</span>
          </div>
          <div className="info-item">
            <span className="info-label">Health Status:</span>
            <span className="info-value">/logs/health-status.json</span>
          </div>
          <div className="info-item">
            <span className="info-label">Notifications:</span>
            <span className="info-value">Email, Slack, Webhook</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
