import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '🏠 基础页面' },
  { to: '/propagation', label: '📡 传播仿真' },
  { to: '/3d-beam', label: '🎯 三维光束' },
  { to: '/sensitivity', label: '📊 敏感性分析' },
  { to: '/experiment', label: '🔬 教学实验' },
  { to: '/datacenter', label: '📋 数据中心' },
];

function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>高斯光束传播虚拟仿真实验平台</h1>
        <span className="course-label">激光原理课程设计</span>
      </div>
      <div className="navbar-links">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default NavBar;
