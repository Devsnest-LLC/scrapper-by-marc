import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Import components
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import NewImport from './pages/NewImport';
import JobDetails from './pages/JobDetails';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Header />
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import/new" element={<NewImport />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;