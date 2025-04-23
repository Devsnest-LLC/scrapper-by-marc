import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaPlus, FaCog } from 'react-icons/fa';

const Header = () => {
  const location = useLocation();
  
  return (
    <Navbar bg="white" expand="lg" className="app-header mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/" className="app-logo">
          Met → Shopify Importer
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              active={location.pathname === '/'}
            >
              Dashboard
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/import/new"
              active={location.pathname === '/import/new'}
            >
              New Import
            </Nav.Link>
          </Nav>
          <Nav>
            <Link to="/import/new" className="me-2">
              <Button variant="primary" size="sm">
                <FaPlus className="me-1" /> New Import
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline-secondary" size="sm">
                <FaCog className="me-1" /> Settings
              </Button>
            </Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;