import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Row, 
  Col, 
  Card, 
  Badge, 
  Tab, 
  Tabs, 
  Progress, 
  Button,
  Alert,
  Table
} from 'react-bootstrap';
import { 
  FaPlay, 
  FaPause, 
  FaDownload, 
  FaEye, 
  FaUpload, 
  FaTrash, 
  FaPlus
} from 'react-icons/fa';
import axios from 'axios';
import moment from 'moment';

// Import components
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchJobs();
    
    // Refresh jobs every 5 seconds for active ones
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        fetchJobs(false);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeTab]);
  
  const fetchJobs = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      let endpoint = '/api/jobs';
      if (activeTab === 'active') {
        endpoint += '?status=pending&status=initialized&status=processing&status=paused';
      } else if (activeTab === 'completed') {
        endpoint += '?status=completed';
      } else if (activeTab === 'failed') {
        endpoint += '?status=failed';
      }
      
      const response = await axios.get(endpoint);
      setJobs(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch jobs. Please try again.');
      console.error('Error fetching jobs:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  const handlePauseJob = async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/pause`);
      fetchJobs(false);
    } catch (err) {
      setError('Failed to pause job. Please try again.');
      console.error('Error pausing job:', err);
    }
  };
  
  const handleResumeJob = async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/resume`);
      fetchJobs(false);
    } catch (err) {
      setError('Failed to resume job. Please try again.');
      console.error('Error resuming job:', err);
    }
  };
  
  const handleCancelJob = async (jobId) => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      try {
        await axios.post(`/api/jobs/${jobId}/cancel`);
        fetchJobs(false);
      } catch (err) {
        setError('Failed to cancel job. Please try again.');
        console.error('Error canceling job:', err);
      }
    }
  };
  
  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job? This cannot be undone.')) {
      try {
        await axios.delete(`/api/jobs/${jobId}`);
        fetchJobs(false);
      } catch (err) {
        setError('Failed to delete job. Please try again.');
        console.error('Error deleting job:', err);
      }
    }
  };
  
  const handleUploadToShopify = async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/upload`);
      fetchJobs(false);
      alert('Upload job started successfully. Check the "Active Jobs" tab to monitor progress.');
    } catch (err) {
      setError('Failed to start Shopify upload. Please try again.');
      console.error('Error starting Shopify upload:', err);
    }
  };
  
  // Render status badge
  const renderStatusBadge = (status) => {
    let variant = 'secondary';
    
    switch (status) {
      case 'pending':
        variant = 'secondary';
        break;
      case 'initialized':
      case 'processing':
        variant = 'primary';
        break;
      case 'paused':
        variant = 'warning';
        break;
      case 'completed':
        variant = 'success';
        break;
      case 'failed':
        variant = 'danger';
        break;
      default:
        variant = 'secondary';
    }
    
    return <Badge bg={variant}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };
  
  // Render active jobs tab
  const renderActiveJobs = () => {
    const activeJobs = jobs.filter(job => 
      ['pending', 'initialized', 'processing', 'paused'].includes(job.status)
    );
    
    if (activeJobs.length === 0) {
      return (
        <Alert variant="info">
          No active jobs. <Link to="/import/new">Start a new import</Link>
        </Alert>
      );
    }
    
    return activeJobs.map(job => (
      <JobCard 
        key={job._id} 
        job={job} 
        onPause={() => handlePauseJob(job._id)}
        onResume={() => handleResumeJob(job._id)}
        onCancel={() => handleCancelJob(job._id)}
      />
    ));
  };
  
  // Render completed jobs tab
  const renderCompletedJobs = () => {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      return (
        <Alert variant="info">
          No completed jobs yet.
        </Alert>
      );
    }
    
    return (
      <Table responsive hover>
        <thead>
          <tr>
            <th>Job Name</th>
            <th>Date Completed</th>
            <th>Items Processed</th>
            <th>Shopify Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {completedJobs.map(job => (
            <tr key={job._id}>
              <td>{job.name}</td>
              <td>{moment(job.completedAt).format('MMM D, YYYY [at] h:mm A')}</td>
              <td>{job.processedIds.length} of {job.totalObjects}</td>
              <td>
                {job.options.skipShopifyUpload ? (
                  <Badge bg="secondary">CSV Only</Badge>
                ) : (
                  <Badge bg="success">Uploaded to Shopify</Badge>
                )}
              </td>
              <td>
                <Link to={`/jobs/${job._id}`} className="me-2">
                  <Button variant="outline-secondary" size="sm">
                    <FaEye /> View
                  </Button>
                </Link>
                <a href={`/api/jobs/${job._id}/csv`} download className="me-2">
                  <Button variant="outline-primary" size="sm">
                    <FaDownload /> CSV
                  </Button>
                </a>
                {job.options.skipShopifyUpload && (
                  <Button 
                    variant="outline-success" 
                    size="sm" 
                    onClick={() => handleUploadToShopify(job._id)}
                    className="me-2"
                  >
                    <FaUpload /> Upload
                  </Button>
                )}
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => handleDeleteJob(job._id)}
                >
                  <FaTrash />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };
  
  // Render failed jobs tab
  const renderFailedJobs = () => {
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    if (failedJobs.length === 0) {
      return (
        <Alert variant="info">
          No failed jobs.
        </Alert>
      );
    }
    
    return (
      <Table responsive hover>
        <thead>
          <tr>
            <th>Job Name</th>
            <th>Date</th>
            <th>Error</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {failedJobs.map(job => (
            <tr key={job._id}>
              <td>{job.name}</td>
              <td>{moment(job.updatedAt).format('MMM D, YYYY [at] h:mm A')}</td>
              <td>{job.error}</td>
              <td>
                <Link to={`/jobs/${job._id}`} className="me-2">
                  <Button variant="outline-secondary" size="sm">
                    <FaEye /> View
                  </Button>
                </Link>
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => handleDeleteJob(job._id)}
                >
                  <FaTrash />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <Link to="/import/new">
          <Button variant="primary">
            <FaPlus className="me-2" /> New Import
          </Button>
        </Link>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="active" title="Active Jobs">
          {loading ? <LoadingSpinner /> : renderActiveJobs()}
        </Tab>
        <Tab eventKey="completed" title="Completed Jobs">
          {loading ? <LoadingSpinner /> : renderCompletedJobs()}
        </Tab>
        <Tab eventKey="failed" title="Failed Jobs">
          {loading ? <LoadingSpinner /> : renderFailedJobs()}
        </Tab>
      </Tabs>
    </div>
  );
};

export default Dashboard;