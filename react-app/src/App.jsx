import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';

const Propagation = lazy(() => import('./pages/Propagation'));
const Beam3D = lazy(() => import('./pages/Beam3D'));
const Experiment = lazy(() => import('./pages/Experiment'));
const Sensitivity = lazy(() => import('./pages/Sensitivity'));
const DataCenter = lazy(() => import('./pages/DataCenter'));

function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="app-main">
        <Suspense fallback={<div className="route-loading">正在加载实验模块…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/propagation" element={<Propagation />} />
            <Route path="/3d-beam" element={<Beam3D />} />
            <Route path="/sensitivity" element={<Sensitivity />} />
            <Route path="/experiment" element={<Experiment />} />
            <Route path="/datacenter" element={<DataCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
