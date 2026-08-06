import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Propagation from './pages/Propagation';
import Beam3D from './pages/Beam3D';
import Experiment from './pages/Experiment';
import Sensitivity from './pages/Sensitivity';
import DataCenter from './pages/DataCenter';

function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/propagation" element={<Propagation />} />
          <Route path="/3d-beam" element={<Beam3D />} />
          <Route path="/sensitivity" element={<Sensitivity />} />
          <Route path="/experiment" element={<Experiment />} />
          <Route path="/datacenter" element={<DataCenter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
