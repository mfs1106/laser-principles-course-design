import React, { useState, useEffect, useRef, useCallback } from 'react';
import Formula from '../components/Formula';
import { calculateGaussianBeam, mmToM, nmToM, fmt } from '../utils/gaussian';
import '../styles/propagation.css';

function Propagation() {
  const [wavelength, setWavelength] = useState(632.8);
  const [waist, setWaist] = useState(0.5);
  const [currentZ, setCurrentZ] = useState(0);
  const [maxZ] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speed] = useState(0.5);

  const mainCanvasRef = useRef(null);
  const crossCanvasRef = useRef(null);
  const intensityCanvasRef = useRef(null);
  const animIdRef = useRef(null);
  const lastTimeRef = useRef(0);
  const drawAllRef = useRef(null);

  const result = calculateGaussianBeam(wavelength, waist, currentZ);

  // Canvas resize handler
  const resizeCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return true;
  }, []);

  // Draw main propagation view
  const drawPropagation = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 40, right: 40, bottom: 50, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const centerY = height / 2;
    const waistMeter = mmToM(waist);
    const lambdaMeter = nmToM(wavelength);
    const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
    const totalZ = maxZ;

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(margin.left, centerY);
    ctx.lineTo(margin.left + plotWidth, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Beam contour fill
    const maxW = waistMeter * 3;
    const yScale = (plotHeight / 2 - 20) / maxW;

    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const z = (i / 200) * totalZ;
      const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      const x = margin.left + (z / totalZ) * plotWidth;
      const y = centerY - w * yScale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = 200; i >= 0; i--) {
      const z = (i / 200) * totalZ;
      const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      const x = margin.left + (z / totalZ) * plotWidth;
      const y = centerY + w * yScale;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createLinearGradient(margin.left, 0, margin.left + plotWidth, 0);
    const ratio = Math.min(1, Math.max(0, zR / totalZ));
    gradient.addColorStop(0, 'rgba(66,215,200,0.2)');
    if (ratio < 1) {
      gradient.addColorStop(ratio, 'rgba(66,215,200,0.15)');
      gradient.addColorStop(ratio, 'rgba(255,107,107,0.15)');
    }
    gradient.addColorStop(1, 'rgba(255,107,107,0.2)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.strokeStyle = '#42d7c8';
    ctx.lineWidth = 2;
    ctx.moveTo(margin.left, centerY);
    ctx.lineTo(margin.left + plotWidth, centerY);
    ctx.stroke();

    // Top contour
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(66,215,200,0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 200; i++) {
      const z = (i / 200) * totalZ;
      const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      const x = margin.left + (z / totalZ) * plotWidth;
      i === 0 ? ctx.moveTo(x, centerY - w * yScale) : ctx.lineTo(x, centerY - w * yScale);
    }
    ctx.stroke();

    // Bottom contour
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,107,107,0.7)';
    for (let i = 0; i <= 200; i++) {
      const z = (i / 200) * totalZ;
      const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      const x = margin.left + (z / totalZ) * plotWidth;
      i === 0 ? ctx.moveTo(x, centerY + w * yScale) : ctx.lineTo(x, centerY + w * yScale);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#666';
    ctx.font = '11px Microsoft YaHei';
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();
    ctx.fillText('传播距离 z (m)', margin.left + plotWidth / 2 - 40, margin.top + plotHeight + 25);
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('光束半径 w(z) (mm)', -30, 0);
    ctx.restore();

    // Markers
    ctx.font = '12px Microsoft YaHei';
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e67e22';
    ctx.fillText('z=0 (束腰)', margin.left - 20, margin.top - 10);

    if (zR <= totalZ && zR > 0) {
      const zRX = margin.left + (zR / totalZ) * plotWidth;
      ctx.strokeStyle = '#3a9e96';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(zRX, margin.top);
      ctx.lineTo(zRX, margin.top + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#3a9e96';
      ctx.fillText(`z=zR (${zR.toFixed(2)}m)`, zRX - 20, margin.top - 10);
    }

    // Current position indicator
    const curX = margin.left + (currentZ / maxZ) * plotWidth;
    const curW = waistMeter * Math.sqrt(1 + Math.pow(currentZ / zR, 2));
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, margin.top);
    ctx.lineTo(curX, margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.fillText(`z=${currentZ.toFixed(2)}m`, curX - 25, margin.top + plotHeight + 35);
  }, [wavelength, waist, currentZ, maxZ]);

  // Draw cross section
  const drawCrossSection = useCallback(() => {
    const canvas = crossCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    const cx = size / 2, cy = size / 2;
    const radius = size / 2 - 5;

    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, size, size);

    const w = result.beamRadius;
    const pixelScale = radius / (w * 3);
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / pixelScale;
        const dy = (y - cy) / pixelScale;
        const r = Math.sqrt(dx * dx + dy * dy);
        const intensity = Math.exp(-2 * r * r / (w * w));
        const idx = (y * size + x) * 4;
        data[idx] = Math.floor(66 + 189 * intensity);
        data[idx + 1] = Math.floor(215 - 100 * (1 - intensity));
        data[idx + 2] = Math.floor(200 + 55 * (1 - intensity));
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(66,215,200,0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, w * pixelScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [result]);

  // Draw intensity curve
  const drawIntensity = useCallback(() => {
    const canvas = intensityCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth || 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const w = result.beamRadius;
    const maxR = w * 2;
    const xScale = plotWidth / (2 * maxR);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (plotHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotWidth, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText('r (mm)', margin.left + plotWidth / 2 - 15, height - 5);

    // Gaussian curve
    ctx.beginPath();
    ctx.strokeStyle = '#42d7c8';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 200; i++) {
      const r = (-maxR + (2 * maxR / 200) * i);
      const intensity = Math.exp(-2 * r * r / (w * w));
      const x = margin.left + (r + maxR) * xScale;
      const y = margin.top + plotHeight * (1 - intensity);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(66,215,200,0.2)';
    ctx.fill();

    // FWHM
    const fwhm = w * 1.177;
    const fwhmX1 = margin.left + (-fwhm + maxR) * xScale;
    const fwhmX2 = margin.left + (fwhm + maxR) * xScale;
    const halfY = margin.top + plotHeight * (1 - 0.5);
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(fwhmX1, halfY);
    ctx.lineTo(fwhmX2, halfY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e67e22';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText('FWHM', (fwhmX1 + fwhmX2) / 2 - 18, halfY - 5);
  }, [result]);

  // Keep every canvas synchronized with the latest React state.
  const drawAll = useCallback(() => {
    drawPropagation();
    drawCrossSection();
    drawIntensity();
  }, [drawPropagation, drawCrossSection, drawIntensity]);

  useEffect(() => {
    drawAllRef.current = drawAll;
  }, [drawAll]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    const animate = (timestamp) => {
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      setCurrentZ(prev => {
        const next = prev + speed * deltaTime;
        return next >= maxZ ? maxZ : next;
      });
      animIdRef.current = requestAnimationFrame(animate);
    };
    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [isAnimating, speed, maxZ]);

  // Stop animation when reaching end
  useEffect(() => {
    if (currentZ >= maxZ) setIsAnimating(false);
  }, [currentZ, maxZ]);

  // Initialize canvas dimensions and keep them in sync with the container.
  useEffect(() => {
    const container = mainCanvasRef.current?.parentElement;
    const handleResize = () => {
      resizeCanvas();
      drawAllRef.current?.();
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (container) observer.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas]);

  // Redraw on param change
  useEffect(() => { drawAll(); }, [drawAll]);

  const reset = () => {
    setIsAnimating(false);
    setCurrentZ(0);
  };

  return (
    <div className="propagation-container">
      <aside className="panel propagation-control">
        <h2>参数设置</h2>
        <div className="input-group">
          <label>波长 λ (nm)</label>
          <input type="number" value={wavelength} min="100" max="2000" step="0.1"
            onChange={e => setWavelength(Number(e.target.value) || 632.8)} />
        </div>
        <div className="input-group">
          <label>束腰 w₀ (mm)</label>
          <input type="number" value={waist} min="0.01" max="5" step="0.01"
            onChange={e => setWaist(Number(e.target.value) || 0.5)} />
        </div>
        <div className="input-group">
          <label>传播距离 z (m)</label>
          <input type="number" value={currentZ} min="0" max={maxZ} step="0.1"
            onChange={e => setCurrentZ(Number(e.target.value) || 0)} />
        </div>
        <div className="input-group">
          <label>传播距离滑块</label>
          <input type="range" value={currentZ} min="0" max={maxZ} step="0.01"
            onChange={e => setCurrentZ(Number(e.target.value))} />
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => setIsAnimating(true)} disabled={isAnimating || currentZ >= maxZ}>▶ 开始</button>
          <button className="btn btn-warning" onClick={() => setIsAnimating(false)} disabled={!isAnimating}>⏸ 暂停</button>
          <button className="btn btn-secondary" onClick={reset}>↺ 重置</button>
        </div>
        <div className="formula-section">
          <h3>📐 物理公式</h3>
          <div className="formula-item"><Formula>{'z_R = \\frac{\\pi w_0^2}{\\lambda}'}</Formula></div>
          <div className="formula-item"><Formula>{'\\theta = \\frac{\\lambda}{\\pi w_0}'}</Formula></div>
          <div className="formula-item"><Formula>{'w(z) = w_0\\sqrt{1 + \\left(\\frac{z}{z_R}\\right)^2}'}</Formula></div>
        </div>
      </aside>

      <main className="propagation-main">
        <div className="canvas-container">
          <canvas ref={mainCanvasRef} />
          <div className="canvas-label">高斯光束传播动画</div>
        </div>
        <div className="propagation-bottom">
          <div className="cross-section-preview panel">
            <h3>当前位置横截面</h3>
            <canvas ref={crossCanvasRef} width="200" height="200" />
            <p className="section-label">二维光斑分布</p>
          </div>
          <div className="intensity-section panel">
            <h3>光强分布曲线 I(r)</h3>
            <canvas ref={intensityCanvasRef} height="150" />
          </div>
        </div>
      </main>

      <aside className="panel propagation-data">
        <h2>实时数据</h2>
        <div className="data-item"><span className="data-label">瑞利长度 zR</span><span className="data-value">{fmt(result.rayleighLength, 4)} m</span></div>
        <div className="data-item"><span className="data-label">发散角 θ</span><span className="data-value">{fmt(result.divergenceAngle * 1000, 4)} mrad</span></div>
        <div className="data-item highlight"><span className="data-label">光束半径 w(z)</span><span className="data-value">{fmt(result.beamRadius * 1000, 4)} mm</span></div>
        <div className="data-item highlight"><span className="data-label">传播距离 z</span><span className="data-value">{fmt(currentZ, 4)} m</span></div>
        <div className="data-item"><span className="data-label">峰值光强 I₀</span><span className="data-value">1.00 (归一化)</span></div>
        <div className="data-item"><span className="data-label">半高宽 FWHM</span><span className="data-value">{fmt(result.beamRadius * 1.177 * 1000, 4)} mm</span></div>
        <div className="legend-section">
          <h3>图例说明</h3>
          <div className="legend-item"><span className="legend-color blue" /><span>瑞利区 (z ≤ zR)</span></div>
          <div className="legend-item"><span className="legend-color red" /><span>发散区 (z {'>'} zR)</span></div>
          <div className="legend-item"><span className="legend-color gold" /><span>z = 0 (束腰位置)</span></div>
          <div className="legend-item"><span className="legend-color orange" /><span>z = zR (瑞利长度)</span></div>
        </div>
      </aside>
    </div>
  );
}

export default Propagation;
