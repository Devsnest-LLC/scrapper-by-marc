import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, ProgressBar, Button, Alert } from 'react-bootstrap';
import { FaPlay, FaPause, FaStop, FaEye } from 'react-icons/fa';
import moment from 'moment';

const JobCard = ({ job, onPause, onResume, onCancel }) => {
  // Determine status badge color
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'initialized':
      case 'processing':
        return 'primary';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  // Format status text
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
  
  return (
    <Card className="job-card mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{job.name}</h5>
        <Badge bg={getStatusBadgeVariant(job.status)}>{formatStatus(job.status)}</Badge>
      </Card.Header>
      <Card.Body>
        <ProgressBar 
          now={job.progress} 
          label={`${job.progress}%`} 
          variant={job.status === 'paused' ? 'warning' : 'primary'}
          animated={job.status === 'processing'}
          className="mb-3"
        />
        
        {job.status === 'paused' && job.pauseReason === 'rate_limit' && (
          <Alert variant="warning" className="rate-limit-alert mb-3">
            <strong>Rate limit reached.</strong> Will resume in {getResumeTimeRemaining()}.
          </Alert>
        )}
        
        <div className="d-flex justify-content-between mb-3">
          <div>
            <div className="mb-1">Started: {moment(job.createdAt).format('MMM D, YYYY [at] h:mm A')}</div>
            <div className="mb-1">
              Processed: {job.processedIds ? job.processedIds.length : 0} of {job.totalObjects || 0} artworks
              {job.failedIds && job.failedIds.length > 0 && ` (${job.failedIds.length} failed)`}
            </div>
            <div>
              <small className="text-muted">
                {job.source === 'url' ? 'From URL' : 'From Category'}: {
                  job.source === 'url' 
                    ? job.query.url?.substring(0, 50) + (job.query.url?.length > 50 ? '...' : '')
                    : (job.query.artworkTypes?.join(', ') || '') + 
                      (job.query.keywords ? ` / Keywords: ${job.query.keywords}` : '')
                }
              </small>
            </div>
          </div>
          <div className="d-flex align-items-start">
            <Link to={`/jobs/${job._id}`} className="me-2">
              <Button variant="outline-secondary" size="sm">
                <FaEye className="me-1" /> View
              </Button>
            </Link>
            
            {job.status === 'processing' || job.status === 'initialized' ? (
              <Button variant="outline-warning" size="sm" onClick={onPause} className="me-2">
                <FaPause className="me-1" /> Pause
              </Button>
            ) : job.status === 'paused' ? (
              <Button variant="outline-primary" size="sm" onClick={onResume} className="me-2">
                <FaPlay className="me-1" /> Resume
              </Button>
            ) : null}
            
            {(job.status === 'processing' || job.status === 'initialized' || job.status === 'paused') && (
              <Button variant="outline-danger" size="sm" onClick={onCancel}>
                <FaStop className="me-1" /> Cancel
              </Button>
            )}
          </div>
        </div>
        
        {job.results && job.results.length > 0 && (
          <div>
            <h6>Recently Processed:</h6>
            <div className="artwork-preview">
              {job.results.slice(-4).map(result => (
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
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default JobCard;