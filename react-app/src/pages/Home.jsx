import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import Formula from '../components/Formula';
import { calculateGaussianBeam, generateBeamCurveData, fmt } from '../utils/gaussian';
import '../styles/home.css';

const DEFAULT_PARAMS = { wavelength: 632.8, waist: 0.5, distance: 5.0 };

function Home() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [results, setResults] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const updateResults = useCallback((p) => {
    const r = calculateGaussianBeam(p.wavelength, p.waist, p.distance);
    setResults(r);
  }, []);

  useEffect(() => {
    updateResults(params);
  }, [params, updateResults]);

  // Initialize ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  // Update chart when params change
  useEffect(() => {
    if (!chartInstance.current) return;

    const { data, rayleighLength } = generateBeamCurveData(
      params.wavelength, params.waist, params.distance > 0 ? params.distance : 1
    );

    const rayleighIdx = Math.floor(rayleighLength / (params.distance > 0 ? params.distance : 1) * data.length);
    const rayleighData = data.slice(0, rayleighIdx + 1);
    const divergenceData = data.slice(rayleighIdx);

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#555' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' },
        formatter: (items) => {
          if (!items?.[0]?.data) return '';
          const p = items[0].data;
          return `z: ${fmt(p[0], 3)} m<br>w(z): ${fmt(p[1], 6)} m`;
        }
      },
      grid: { top: 60, right: 40, bottom: 80, left: 80 },
      xAxis: {
        type: 'value', name: '传播距离 z / m', nameLocation: 'middle', nameGap: 50,
        nameTextStyle: { color: '#3a9e96', fontSize: 13 },
        axisLine: { lineStyle: { color: '#d0d5dd', width: 2 } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value', name: '光束半径 w(z) / m',
        nameTextStyle: { color: '#3a9e96', fontSize: 13 },
        axisLine: { lineStyle: { color: '#d0d5dd', width: 2 } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: [
        { name: '瑞利区 (z≤zR)', type: 'line', smooth: false, showSymbol: false, data: rayleighData, lineStyle: { width: 0 }, areaStyle: { color: 'rgba(68,170,255,0.2)' } },
        { name: '发散区 (z>zR)', type: 'line', smooth: false, showSymbol: false, data: divergenceData, lineStyle: { width: 0 }, areaStyle: { color: 'rgba(255,100,68,0.2)' } },
        {
          name: '光束半径', type: 'line', smooth: true, showSymbol: false, data,
          lineStyle: { width: 3, color: '#42d7c8' },
          markLine: {
            silent: true, symbol: ['none', 'none'],
            lineStyle: { color: ['#e67e22', '#3a9e96'], type: ['dashed', 'dashed'], width: [2, 2] },
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
            data: [
              { xAxis: 0, label: { formatter: 'z=0 (束腰)', color: '#e67e22' } },
              { xAxis: rayleighLength, label: { formatter: 'z=zR (瑞利长度)', color: '#3a9e96' } }
            ]
          }
        },
        {
          name: '发散区标注', type: 'line', smooth: false, showSymbol: false,
          data: [[Math.min(rayleighLength * 1.5, (params.distance || 1) * 0.9), data[0]?.[1] * 0.1 || 0]],
          lineStyle: { width: 0 },
          label: { show: true, position: 'top', formatter: 'z>zR (发散区)', color: '#e67e22', fontSize: 12, fontWeight: 'bold' }
        }
      ],
      legend: {
        show: true, bottom: 35, left: 'center',
        data: ['光束半径', '瑞利区 (z≤zR)', '发散区 (z>zR)'],
        textStyle: { color: '#555', fontSize: 11 }, itemWidth: 14, itemHeight: 14
      }
    }, true);
  }, [params, results]);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: Number(value) || 0 }));
  };

  return (
    <div className="home-container">
      {/* Spot Display */}
      <div className="home-spot-section panel">
        <h2>高斯光斑模拟</h2>
        <SpotCanvas params={params} results={results} />
      </div>

      <div className="home-layout">
        {/* Control Panel */}
        <aside className="panel home-control-panel">
          <h2>参数控制区</h2>
          <form onSubmit={e => e.preventDefault()}>
            <div className="input-group">
              <label>波长 λ (nm)</label>
              <input type="number" value={params.wavelength} min="100" max="2000" step="0.1"
                onChange={e => handleParamChange('wavelength', e.target.value)} />
            </div>
            <div className="input-group">
              <label>束腰 w₀ (mm)</label>
              <input type="number" value={params.waist} min="0.01" max="5" step="0.01"
                onChange={e => handleParamChange('waist', e.target.value)} />
            </div>
            <div className="input-group">
              <label>传播距离 z (m)</label>
              <input type="number" value={params.distance} min="0" max="100" step="0.1"
                onChange={e => handleParamChange('distance', e.target.value)} />
            </div>
          </form>
        </aside>

        {/* Chart Area */}
        <section className="panel home-chart-panel">
          <h2>光束传播显示区</h2>
          <div ref={chartRef} style={{ flex: 1, minHeight: 420 }} />
        </section>

        {/* Results Panel */}
        <aside className="panel home-results-panel">
          <h2>计算结果区</h2>
          <div className="result-list">
            <div className="result-item">
              <span>瑞利长度 zR</span>
              <strong>{results ? fmt(results.rayleighLength) + ' m' : '--'}</strong>
            </div>
            <div className="result-item">
              <span>光束半径 w(z)</span>
              <strong>{results ? fmt(results.beamRadius) + ' m' : '--'}</strong>
            </div>
            <div className="result-item">
              <span>发散角 θ</span>
              <strong>{results ? fmt(results.divergenceAngle) + ' rad' : '--'}</strong>
            </div>
          </div>

          <div className="formula-section">
            <h3>📐 物理公式</h3>
            <div className="formula-item"><Formula>{'z_R = \\frac{\\pi w_0^2}{\\lambda}'}</Formula></div>
            <div className="formula-item"><Formula>{'\\theta = \\frac{\\lambda}{\\pi w_0}'}</Formula></div>
            <div className="formula-item"><Formula>{'w(z) = w_0\\sqrt{1 + \\left(\\frac{z}{z_R}\\right)^2}'}</Formula></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* Gaussian Spot Canvas Component */
function SpotCanvas({ params, results }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 300;

    const draw = () => {
      ctx.fillStyle = '#fafbfc';
      ctx.fillRect(0, 0, size, size);

      const cR = results?.beamRadius || calculateGaussianBeam(params.wavelength, params.waist, 1).beamRadius;
      const waistM = (params.waist * 1e-3);
      const pixelScale = (size / 2 - 10) / (cR * 4);

      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;
      const cx = size / 2, cy = size / 2;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = (x - cx) / pixelScale;
          const dy = (y - cy) / pixelScale;
          const r = Math.sqrt(dx * dx + dy * dy);
          const intensity = Math.exp(-2 * r * r / (cR * cR));
          const i = (y * size + x) * 4;
          data[i] = Math.floor(66 + 189 * intensity);
          data[i + 1] = Math.floor(215 - 60 * (1 - intensity));
          data[i + 2] = Math.floor(200 - 50 * (1 - intensity));
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Crosshair
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - size / 2 + 10, cy);
      ctx.lineTo(cx + size / 2 - 10, cy);
      ctx.moveTo(cx, cy - size / 2 + 10);
      ctx.lineTo(cx, cy + size / 2 - 10);
      ctx.stroke();

      // Beam radius circle
      ctx.strokeStyle = 'rgba(66,215,200,0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, cR * pixelScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    draw();
    animRef.current = setInterval(draw, 250);

    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [params, results]);

  return (
    <div className="spot-canvas-wrapper">
      <canvas ref={canvasRef} width="300" height="300" style={{ width: 300, height: 300, borderRadius: 8, border: '1px solid #dde1e6' }} />
      <div className="spot-info">
        <div className="spot-param-row">
          <span className="spot-param-label">束腰 w₀</span>
          <span className="spot-param-value">{params.waist} mm</span>
        </div>
        <div className="spot-param-row">
          <span className="spot-param-label">光束半径 w(z)</span>
          <span className="spot-param-value">{results ? fmt(results.beamRadius * 1000, 3) + ' mm' : '--'}</span>
        </div>
      </div>
    </div>
  );
}

export default Home;
