import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Button, 
  Alert,
  Row,
  Col
} from 'react-bootstrap';
import { FaSave } from 'react-icons/fa';

const Settings = () => {
  // Shopify API settings
  const [shopifyShopName, setShopifyShopName] = useState('');
  const [shopifyApiKey, setShopifyApiKey] = useState('');
  const [shopifyApiPassword, setShopifyApiPassword] = useState('');
  
  // OpenAI API settings
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-3.5-turbo');
  
  // Default import settings
  const [defaultMaxItems, setDefaultMaxItems] = useState(100);
  const [defaultSkipShopify, setDefaultSkipShopify] = useState(true);
  const [defaultPrice, setDefaultPrice] = useState(99.99);
  
  // UI state
  const [shopifySuccess, setShopifySuccess] = useState(false);
  const [openaiSuccess, setOpenaiSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [shopifyError, setShopifyError] = useState('');
  const [openaiError, setOpenaiError] = useState('');
  const [importError, setImportError] = useState('');
  
  // Load settings on mount
  useEffect(() => {
    // In a real app, these would be loaded from an API endpoint
    // Here we'll simulate loading from localStorage for demonstration
    const loadSettings = () => {
      // Shopify settings
      const shopName = localStorage.getItem('shopifyShopName') || '';
      const apiKey = localStorage.getItem('shopifyApiKey') || '';
      const apiPassword = localStorage.getItem('shopifyApiPassword') || '';
      
      setShopifyShopName(shopName);
      setShopifyApiKey(apiKey);
      setShopifyApiPassword(apiPassword);
      
      // OpenAI settings
      const oaiKey = localStorage.getItem('openaiApiKey') || '';
      const oaiModel = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
      
      setOpenaiApiKey(oaiKey);
      setOpenaiModel(oaiModel);
      
      // Import settings
      const maxItems = localStorage.getItem('defaultMaxItems') || 100;
      const skipShopify = localStorage.getItem('defaultSkipShopify') === 'true';
      const price = localStorage.getItem('defaultPrice') || 99.99;
      
      setDefaultMaxItems(maxItems);
      setDefaultSkipShopify(skipShopify);
      setDefaultPrice(price);
    };
    
    loadSettings();
  }, []);
  
  // Handle Shopify settings form submission
  const handleShopifySubmit = (e) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!shopifyShopName || !shopifyApiKey || !shopifyApiPassword) {
        setShopifyError('All fields are required');
        return;
      }
      
      // In a real app, this would be sent to an API endpoint
      // Here we'll just save to localStorage for demonstration
      localStorage.setItem('shopifyShopName', shopifyShopName);
      localStorage.setItem('shopifyApiKey', shopifyApiKey);
      localStorage.setItem('shopifyApiPassword', shopifyApiPassword);
      
      setShopifySuccess(true);
      setShopifyError('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShopifySuccess(false);
      }, 3000);
    } catch (err) {
      setShopifyError('Failed to save Shopify settings');
      setShopifySuccess(false);
    }
  };
  
  // Handle OpenAI settings form submission
  const handleOpenAiSubmit = (e) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!openaiApiKey) {
        setOpenaiError('API Key is required');
        return;
      }
      
      // In a real app, this would be sent to an API endpoint
      localStorage.setItem('openaiApiKey', openaiApiKey);
      localStorage.setItem('openaiModel', openaiModel);
      
      setOpenaiSuccess(true);
      setOpenaiError('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setOpenaiSuccess(false);
      }, 3000);
    } catch (err) {
      setOpenaiError('Failed to save OpenAI settings');
      setOpenaiSuccess(false);
    }
  };
  
  // Handle import settings form submission
  const handleImportSubmit = (e) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (defaultMaxItems <= 0 || defaultPrice < 0) {
        setImportError('Invalid values');
        return;
      }
      
      // In a real app, this would be sent to an API endpoint
      localStorage.setItem('defaultMaxItems', defaultMaxItems);
      localStorage.setItem('defaultSkipShopify', defaultSkipShopify);
      localStorage.setItem('defaultPrice', defaultPrice);
      
      setImportSuccess(true);
      setImportError('');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setImportSuccess(false);
      }, 3000);
    } catch (err) {
      setImportError('Failed to save import settings');
      setImportSuccess(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Settings</h1>
      
      <div className="settings-section">
        <h3>Shopify API</h3>
        <p className="text-muted">
          Configure your Shopify store API credentials to enable direct uploads.
        </p>
        
        <Card className="form-card">
          <Card.Body>
            {shopifySuccess && (
              <Alert variant="success">Shopify settings saved successfully!</Alert>
            )}
            
            {shopifyError && (
              <Alert variant="danger">{shopifyError}</Alert>
            )}
            
            <Form onSubmit={handleShopifySubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Shop Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={shopifyShopName}
                  onChange={(e) => setShopifyShopName(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Your Shopify store URL (e.g., your-store.myshopify.com)
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>API Key</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Shopify API Key"
                  value={shopifyApiKey}
                  onChange={(e) => setShopifyApiKey(e.target.value)}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>API Password / Access Token</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Shopify API Password"
                  value={shopifyApiPassword}
                  onChange={(e) => setShopifyApiPassword(e.target.value)}
                />
                <Form.Text className="text-muted">
                  From your Shopify admin private app or custom app credentials
                </Form.Text>
              </Form.Group>
              
              <Button variant="primary" type="submit">
                <FaSave className="me-2" /> Save Shopify Settings
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
      
      <div className="settings-section">
        <h3>OpenAI API</h3>
        <p className="text-muted">
          Configure your OpenAI API credentials for generating artwork descriptions.
        </p>
        
        <Card className="form-card">
          <Card.Body>
            {openaiSuccess && (
              <Alert variant="success">OpenAI settings saved successfully!</Alert>
            )}
            
            {openaiError && (
              <Alert variant="danger">{openaiError}</Alert>
            )}
            
            <Form onSubmit={handleOpenAiSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>API Key</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="OpenAI API Key"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Your OpenAI API key from openai.com
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Model</Form.Label>
                <Form.Select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, lower cost)</option>
                  <option value="gpt-4">GPT-4 (Higher quality, higher cost)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Select the AI model used for generating descriptions
                </Form.Text>
              </Form.Group>
              
              <Button variant="primary" type="submit">
                <FaSave className="me-2" /> Save OpenAI Settings
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
      
      <div className="settings-section">
        <h3>Default Import Settings</h3>
        <p className="text-muted">
          Configure default settings for new import jobs.
        </p>
        
        <Card className="form-card">
          <Card.Body>
            {importSuccess && (
              <Alert variant="success">Import settings saved successfully!</Alert>
            )}
            
            {importError && (
              <Alert variant="danger">{importError}</Alert>
            )}
            
            <Form onSubmit={handleImportSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Default Maximum Items</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={defaultMaxItems}
                      onChange={(e) => setDefaultMaxItems(parseInt(e.target.value))}
                    />
                    <Form.Text className="text-muted">
                      Default limit on the number of artworks to import
                    </Form.Text>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Default Price ($)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(parseFloat(e.target.value))}
                    />
                    <Form.Text className="text-muted">
                      Default price for imported artwork
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="default-skip-shopify"
                  label="Skip Shopify upload by default (generate CSV only)"
                  checked={defaultSkipShopify}
                  onChange={(e) => setDefaultSkipShopify(e.target.checked)}
                />
              </Form.Group>
              
              <Button variant="primary" type="submit">
                <FaSave className="me-2" /> Save Import Settings
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Settings;