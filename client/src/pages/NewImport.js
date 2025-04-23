import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Form, 
  Button,
  Alert, 
  Tabs, 
  Tab,
  Accordion,
  Row,
  Col
} from 'react-bootstrap';
import { FaArrowRight } from 'react-icons/fa';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const NewImport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('url');
  
  // URL form state
  const [url, setUrl] = useState('');
  const [urlName, setUrlName] = useState('');
  const [urlOpenAccessOnly, setUrlOpenAccessOnly] = useState(true);
  
  // Category form state
  const [departments, setDepartments] = useState([]);
  const [artworkTypes, setArtworkTypes] = useState([]);
  const [timePeriods, setTimePeriods] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedArtTypes, setSelectedArtTypes] = useState([]);
  const [selectedTimePeriods, setSelectedTimePeriods] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryOpenAccessOnly, setCategoryOpenAccessOnly] = useState(true);
  
  // Advanced options
  const [maxItems, setMaxItems] = useState(100);
  const [skipShopifyUpload, setSkipShopifyUpload] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [defaultPrice, setDefaultPrice] = useState(99.99);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Fetch categories, artwork types, and time periods on mount
  useEffect(() => {
    fetchOptions();
  }, []);
  
  const fetchOptions = async () => {
    try {
      const [categoriesRes, typesRes, periodsRes] = await Promise.all([
        axios.get('/api/met/categories'),
        axios.get('/api/met/artwork-types'),
        axios.get('/api/met/time-periods')
      ]);
      
      setDepartments(categoriesRes.data);
      setArtworkTypes(typesRes.data);
      setTimePeriods(periodsRes.data);
    } catch (err) {
      console.error('Error fetching options:', err);
      setError('Failed to load form options. Please refresh the page.');
    }
  };
  
  // Handle URL form submission
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a valid Met Museum URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Add openAccess parameter to URL if checkbox is checked
      let processedUrl = url;
      if (urlOpenAccessOnly && !url.includes('showOnly=openAccess')) {
        const separator = url.includes('?') ? '&' : '?';
        processedUrl = `${url}${separator}showOnly=openAccess`;
      }
      
      // Create job from URL
      const jobData = {
        url: processedUrl,
        name: urlName || `URL Import: ${new Date().toLocaleString()}`,
        options: {
          maxItems,
          skipShopifyUpload,
          skipExisting,
          defaultPrice
        }
      };
      
      const response = await axios.post('/api/jobs/url', jobData);
      
      setSuccess('Import job created successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Error creating URL job:', err);
      setError(err.response?.data?.message || 'Failed to create import job. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle category form submission
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    if (selectedDepartments.length === 0 && selectedArtTypes.length === 0 && 
        selectedTimePeriods.length === 0 && !keywords) {
      setError('Please select at least one department, category, time period, or enter keywords');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Create job from category
      const jobData = {
        name: categoryName || `Category Import: ${new Date().toLocaleString()}`,
        artworkTypes: selectedArtTypes,
        timePeriods: selectedTimePeriods,
        departmentIds: selectedDepartments.map(dept => parseInt(dept)),
        keywords,
        isPublicDomain: categoryOpenAccessOnly,
        options: {
          maxItems,
          skipShopifyUpload,
          skipExisting,
          defaultPrice
        }
      };
      
      const response = await axios.post('/api/jobs/category', jobData);
      
      setSuccess('Import job created successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Error creating category job:', err);
      setError(err.response?.data?.message || 'Failed to create import job. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle artwork type selection
  const handleArtTypeChange = (e) => {
    const value = e.target.value;
    setSelectedArtTypes(prev => 
      prev.includes(value)
        ? prev.filter(type => type !== value)
        : [...prev, value]
    );
  };
  
  // Handle time period selection
  const handleTimePeriodChange = (e) => {
    const value = e.target.value;
    setSelectedTimePeriods(prev => 
      prev.includes(value)
        ? prev.filter(period => period !== value)
        : [...prev, value]
    );
  };
  
  // Handle department selection
  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setSelectedDepartments(prev => 
      prev.includes(value)
        ? prev.filter(dept => dept !== value)
        : [...prev, value]
    );
  };
  
  if (loading) {
    return <LoadingSpinner text="Creating import job..." />;
  }
  
  return (
    <div>
      <h1 className="mb-4">Create New Import</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="form-card">
        <Card.Body>
          <p className="text-muted">Choose how you want to import artwork from the Met Museum:</p>
          
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="url" title="Met Search URL">
              <Form onSubmit={handleUrlSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Met Museum Search URL</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="https://www.metmuseum.org/art/collection/search?..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Paste a URL from the Met Museum search results page
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="url-open-access-only"
                    label="Ensure Open Access Only (public domain artwork)"
                    checked={urlOpenAccessOnly}
                    onChange={(e) => setUrlOpenAccessOnly(e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    This will ensure only public domain artwork is imported, even if not specified in the URL
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Job Name (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="E.g., 19th Century Landscapes"
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                  />
                </Form.Group>
                
                <Accordion className="mb-3">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Advanced Options</Accordion.Header>
                    <Accordion.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Maximum Items</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={maxItems}
                          onChange={(e) => setMaxItems(parseInt(e.target.value))}
                        />
                        <Form.Text className="text-muted">
                          Limit the number of artworks to import
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="skip-upload-url"
                          label="Generate CSV only (don't upload to Shopify)"
                          checked={skipShopifyUpload}
                          onChange={(e) => setSkipShopifyUpload(e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="skip-existing-url"
                          label="Skip artworks already imported"
                          checked={skipExisting}
                          onChange={(e) => setSkipExisting(e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Default Price ($)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={defaultPrice}
                          onChange={(e) => setDefaultPrice(parseFloat(e.target.value))}
                        />
                      </Form.Group>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
                
                <Button type="submit" variant="primary">
                  Start Import <FaArrowRight className="ms-1" />
                </Button>
              </Form>
            </Tab>
            
            <Tab eventKey="category" title="Categories & Filters">
              <Form onSubmit={handleCategorySubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <div className="mb-3 border p-3 rounded" style={{maxHeight: '200px', overflowY: 'auto'}}>
                        {departments.map(dept => (
                          <Form.Check
                            key={`dept-${dept.id}`}
                            type="checkbox"
                            id={`department-${dept.id}`}
                            label={dept.name}
                            value={dept.id}
                            checked={selectedDepartments.includes(dept.id.toString())}
                            onChange={handleDepartmentChange}
                            className="mb-1"
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Artwork Type</Form.Label>
                      <div className="mb-3 border p-3 rounded" style={{maxHeight: '200px', overflowY: 'auto'}}>
                        {artworkTypes.map(type => (
                          <Form.Check
                            key={type}
                            type="checkbox"
                            id={`art-type-${type}`}
                            label={type}
                            value={type}
                            checked={selectedArtTypes.includes(type)}
                            onChange={handleArtTypeChange}
                            className="mb-1"
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Time Period</Form.Label>
                      <div className="mb-3 border p-3 rounded" style={{maxHeight: '200px', overflowY: 'auto'}}>
                        {timePeriods.map(period => (
                          <Form.Check
                            key={period}
                            type="checkbox"
                            id={`time-period-${period}`}
                            label={period}
                            value={period}
                            checked={selectedTimePeriods.includes(period)}
                            onChange={handleTimePeriodChange}
                            className="mb-1"
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Keyword Search</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. landscape, portrait, nature"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                      />
                      <Form.Text className="text-muted">
                        Enter keywords separated by commas
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="category-open-access-only"
                        label="Open Access Only (public domain artwork)"
                        checked={categoryOpenAccessOnly}
                        onChange={(e) => setCategoryOpenAccessOnly(e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Only import artworks that are in the public domain
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Job Name (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="E.g., Renaissance Portraits"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                  />
                </Form.Group>
                
                <Accordion className="mb-3">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Advanced Options</Accordion.Header>
                    <Accordion.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Maximum Items</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={maxItems}
                          onChange={(e) => setMaxItems(parseInt(e.target.value))}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="skip-upload-category"
                          label="Generate CSV only (don't upload to Shopify)"
                          checked={skipShopifyUpload}
                          onChange={(e) => setSkipShopifyUpload(e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="skip-existing-category"
                          label="Skip artworks already imported"
                          checked={skipExisting}
                          onChange={(e) => setSkipExisting(e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Default Price ($)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={defaultPrice}
                          onChange={(e) => setDefaultPrice(parseFloat(e.target.value))}
                        />
                      </Form.Group>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
                
                <Button type="submit" variant="primary">
                  Start Import <FaArrowRight className="ms-1" />
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
};

export default NewImport;
