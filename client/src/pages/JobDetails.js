// client/src/pages/JobDetails.js - Updated with image download button
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  Alert,
  Table,
  Row,
  Col,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  FaDownload,
  FaUpload,
  FaPlay,
  FaPause,
  FaStop,
  FaArrowLeft,
  FaImages
} from 'react-icons/fa';
import axios from 'axios';
import moment from 'moment';
import LoadingSpinner from '../components/LoadingSpinner';

const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [imageDownloading, setImageDownloading] = useState(false); // Track image download state
  
  useEffect(() => {
    fetchJobDetails();
    
    // Poll for updates if job is active
    const interval = setInterval(() => {
      if (job && ['pending', 'initialized', 'processing', 'paused'].includes(job.status)) {
        fetchJobDetails(false);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id]);
  
  // Fetch job details
  const fetchJobDetails = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await axios.get(`/api/jobs/${id}`);
      setJob(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch job details. Please try again.');
      console.error('Error fetching job details:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  // Handle pause job
  const handlePauseJob = async () => {
    try {
      await axios.post(`/api/jobs/${id}/pause`);
      fetchJobDetails();
    } catch (err) {
      setError('Failed to pause job. Please try again.');
      console.error('Error pausing job:', err);
    }
  };
  
  // Handle resume job
  const handleResumeJob = async () => {
    try {
      await axios.post(`/api/jobs/${id}/resume`);
      fetchJobDetails();
    } catch (err) {
      setError('Failed to resume job. Please try again.');
      console.error('Error resuming job:', err);
    }
  };
  
  // Handle cancel job
  const handleCancelJob = async () => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      try {
        await axios.post(`/api/jobs/${id}/cancel`);
        fetchJobDetails();
      } catch (err) {
        setError('Failed to cancel job. Please try again.');
        console.error('Error canceling job:', err);
      }
    }
  };
  
  // Handle upload to Shopify
  const handleUploadToShopify = async () => {
    try {
      await axios.post(`/api/jobs/${id}/upload`);
      fetchJobDetails();
      alert('Upload job started successfully. Check the Dashboard to monitor progress.');
    } catch (err) {
      setError('Failed to start Shopify upload. Please try again.');
      console.error('Error starting Shopify upload:', err);
    }
  };
  
  // Handle download images
  const handleDownloadImages = () => {
    setImageDownloading(true);
    try {
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = `/api/jobs/${id}/images`;
      link.download = `images-${id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download images. Please try again.');
      console.error('Error downloading images:', err);
    } finally {
      // Set a timeout to reset the downloading state after a reasonable time
      setTimeout(() => {
        setImageDownloading(false);
      }, 3000);
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
  
  // Calculate time until resume
  const getResumeTimeRemaining = () => {
    if (!job.resumeAfter) return null;
    
    const resumeAt = new Date(job.resumeAfter);
    const now = new Date();
    
    if (resumeAt <= now) return 'resuming soon';
    
    const diffSeconds = Math.floor((resumeAt - now) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds`;
    } else {
      const minutes = Math.floor(diffSeconds / 60);
      const seconds = diffSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }
  };
  
  // Render job details
  const renderJobDetails = () => {
    if (!job) return null;
    
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <Link to="/" className="me-3">
              <Button variant="outline-secondary" size="sm">
                <FaArrowLeft /> Back
              </Button>
            </Link>
            <h1 className="mb-0">{job.name}</h1>
          </div>
          <div>{renderStatusBadge(job.status)}</div>
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        {job.status === 'processing' || job.status === 'initialized' ? (
          <div className="mb-4">
            <ProgressBar 
              now={job.progress} 
              label={`${job.progress}%`} 
              animated 
              variant="primary" 
            />
          </div>
        ) : job.status === 'paused' ? (
          <div className="mb-4">
            <ProgressBar 
              now={job.progress} 
              label={`${job.progress}%`} 
              variant="warning" 
            />
            
            {job.pauseReason === 'rate_limit' && (
              <Alert variant="warning" className="mt-2">
                <strong>Rate limit reached.</strong> Will resume in {getResumeTimeRemaining()}.
              </Alert>
            )}
          </div>
        ) : null}
        
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2">
            {(job.status === 'processing' || job.status === 'initialized') && (
              <Button variant="warning" onClick={handlePauseJob}>
                <FaPause className="me-1" /> Pause
              </Button>
            )}
            
            {job.status === 'paused' && (
              <Button variant="primary" onClick={handleResumeJob}>
                <FaPlay className="me-1" /> Resume
              </Button>
            )}
            
            {['pending', 'initialized', 'processing', 'paused'].includes(job.status) && (
              <Button variant="danger" onClick={handleCancelJob}>
                <FaStop className="me-1" /> Cancel
              </Button>
            )}
            
            {job.status === 'completed' && (
              <>
                <a href={`/api/jobs/${job._id}/csv`} download>
                  <Button variant="primary">
                    <FaDownload className="me-1" /> Download CSV
                  </Button>
                </a>
                
                <Button
                  variant="info"
                  onClick={handleDownloadImages}
                  disabled={imageDownloading}
                  className="ms-2"
                >
                  <FaImages className="me-1" /> 
                  {imageDownloading ? 'Preparing Images...' : 'Download All Images'}
                </Button>
                
                {job.options.skipShopifyUpload && (
                  <Button variant="success" onClick={handleUploadToShopify} className="ms-2">
                    <FaUpload className="me-1" /> Upload to Shopify
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="overview" title="Overview">
            <Card>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h5>Job Details</h5>
                    <Table>
                      <tbody>
                        <tr>
                          <td>Status</td>
                          <td>{renderStatusBadge(job.status)}</td>
                        </tr>
                        <tr>
                          <td>Created</td>
                          <td>{moment(job.createdAt).format('MMM D, YYYY [at] h:mm A')}</td>
                        </tr>
                        {job.completedAt && (
                          <tr>
                            <td>Completed</td>
                            <td>{moment(job.completedAt).format('MMM D, YYYY [at] h:mm A')}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Progress</td>
                          <td>
                            {job.processedIds ? job.processedIds.length : 0} of {job.totalObjects || 0} artworks
                            {job.failedIds && job.failedIds.length > 0 && ` (${job.failedIds.length} failed)`}
                          </td>
                        </tr>
                        <tr>
                          <td>Source</td>
                          <td>
                            {job.source === 'url' ? (
                              <>
                                URL Import
                                <div className="text-muted small">
                                  {job.query.url}
                                </div>
                              </>
                            ) : (
                              <>
                                Category Import
                                <div className="text-muted small">
                                  {job.query.artworkTypes?.join(', ') || ''} 
                                  {job.query.keywords ? ` / Keywords: ${job.query.keywords}` : ''}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  
                  <Col md={6}>
                    <h5>Import Options</h5>
                    <Table>
                      <tbody>
                        <tr>
                          <td>Maximum Items</td>
                          <td>{job.options.maxItems || 'No limit'}</td>
                        </tr>
                        <tr>
                          <td>Shopify Upload</td>
                          <td>{job.options.skipShopifyUpload ? 'CSV Only' : 'Enabled'}</td>
                        </tr>
                        <tr>
                          <td>Skip Existing</td>
                          <td>{job.options.skipExisting ? 'Yes' : 'No'}</td>
                        </tr>
                        <tr>
                          <td>Default Price</td>
                          <td>${job.options.defaultPrice || '99.99'}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
                
                {job.error && (
                  <Alert variant="danger" className="mt-3">
                    <strong>Error:</strong> {job.error}
                  </Alert>
                )}
              </Card.Body>
            </Card>
            
            {job.results && job.results.length > 0 && (
              <Card className="mt-4">
                <Card.Body>
                  <h5>Artwork Preview</h5>
                  <div className="artwork-preview">
                    {job.results.slice(0, 8).map(result => (
                      <div key={result.objectId} className="artwork-item">
                        {result.imageUrl ? (
                          <img src={result.imageUrl} alt={result.title} />
                        ) : (
                          <div className="artwork-image-placeholder"></div>
                        )}
                        <div className="artwork-info">
                          <div className="artwork-title">{result.title}</div>
                          <div className="text-muted">{result.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </Tab>
          
          <Tab eventKey="results" title="Results">
            <Card>
              <Card.Body>
                <h5>Processed Artworks</h5>
                
                {!job.results || job.results.length === 0 ? (
                  <Alert variant="info">No artworks have been processed yet.</Alert>
                ) : (
                  <Table responsive hover className="mt-3">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Date</th>
                        <th>Collections</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.results.map(result => (
                        <tr key={result.objectId}>
                          <td>{result.objectId}</td>
                          <td>{result.title}</td>
                          <td>{result.artist}</td>
                          <td>{result.date}</td>
                          <td>
                            <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {result.collections?.join(', ') || 'None'}
                            </div>
                          </td>
                          <td>
                            {result.processed ? (
                              result.error ? (
                                <Badge bg="danger">Error</Badge>
                              ) : (
                                result.shopifyProductId ? (
                                  <Badge bg="success">Uploaded</Badge>
                                ) : (
                                  <Badge bg="info">Processed</Badge>
                                )
                              )
                            ) : (
                              <Badge bg="secondary">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
          
          <Tab eventKey="errors" title="Errors" disabled={!job.failedIds || job.failedIds.length === 0}>
            <Card>
              <Card.Body>
                <h5>Failed Artworks</h5>
                
                {!job.failedIds || job.failedIds.length === 0 ? (
                  <Alert variant="success">No errors have occurred.</Alert>
                ) : (
                  <Table responsive hover className="mt-3">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.results
                        .filter(result => result.error)
                        .map(result => (
                          <tr key={result.objectId}>
                            <td>{result.objectId}</td>
                            <td>{result.error}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </div>
    );
  };
  
  if (loading) {
    return <LoadingSpinner text="Loading job details..." />;
  }
  
  if (error && !job) {
    return (
      <Alert variant="danger">
        {error}
        <div className="mt-3">
          <Link to="/">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        </div>
      </Alert>
    );
  }
  
  return renderJobDetails();
};

export default JobDetails;
