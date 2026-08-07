import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Formula from '../components/Formula';
import useEChart from '../hooks/useEChart';
import { calculateGaussianBeam } from '../utils/gaussian';
import '../styles/lab-pages.css';

const STORAGE_KEY = 'laserExperimentRecords';

const EXPERIMENTS = {
  1: {
    title: '波长对发散角的影响', description: '观察不同波长激光束的发散角变化',
    initial: { wavelength: 632.8, waist: 0.5, z: 1 },
    steps: [
      ['实验原理', '发散角 θ 与波长 λ 成正比，与束腰 w₀ 成反比。固定束腰时，波长越大，发散角越大。', 'initial'],
      ['固定束腰', '固定束腰 w₀ = 0.5 mm，作为后续波长对比的统一条件。', 'params', { waist: 0.5 }],
      ['蓝光演示', '设置 λ = 400 nm，发散角约为 0.255 mrad。', 'params', { wavelength: 400 }],
      ['He-Ne 激光演示', '设置 λ = 632.8 nm，发散角约为 0.403 mrad。', 'params', { wavelength: 632.8 }],
      ['近红外演示', '设置 λ = 1000 nm，发散角约为 0.637 mrad。', 'params', { wavelength: 1000 }],
      ['对比总结', '波长增大 2.5 倍时，发散角也增大 2.5 倍，验证二者成正比。', 'wavelengths', [400, 632.8, 1000]]
    ]
  },
  2: {
    title: '束腰对瑞利长度的影响', description: '观察不同束腰大小对瑞利长度的影响',
    initial: { wavelength: 632.8, waist: 0.5, z: 1 },
    steps: [
      ['实验原理', '瑞利长度 zR 与束腰平方成正比，与波长成反比。', 'initial'],
      ['固定波长', '固定 λ = 632.8 nm，比较不同束腰下的瑞利长度。', 'params', { wavelength: 632.8 }],
      ['小束腰', '设置 w₀ = 0.2 mm，瑞利长度约为 0.198 m。', 'params', { waist: 0.2 }],
      ['中等束腰', '设置 w₀ = 0.5 mm，瑞利长度约为 1.241 m。', 'params', { waist: 0.5 }],
      ['大束腰', '设置 w₀ = 1.0 mm，瑞利长度约为 4.965 m。', 'params', { waist: 1 }],
      ['对比总结', '束腰增大 5 倍时，瑞利长度约增大 25 倍，验证平方关系。', 'waists', [0.2, 0.5, 1]]
    ]
  },
  3: {
    title: '传播距离对光束扩散的影响', description: '观察光束随传播距离的扩散变化',
    initial: { wavelength: 632.8, waist: 0.5, z: 0 },
    steps: [
      ['实验原理', '光束在 z = 0 处最细；到达瑞利长度后，光束半径开始明显增大。', 'initial'],
      ['设置参数', '设置 λ = 632.8 nm、w₀ = 0.5 mm，瑞利长度约为 1.24 m。', 'params', { wavelength: 632.8, waist: 0.5 }],
      ['束腰位置', '在 z = 0 处，光束半径等于束腰 w₀。', 'params', { z: 0 }],
      ['瑞利长度位置', '在 z = zR ≈ 1.24 m 处，光束半径增大为 √2w₀。', 'params', { z: 1.24 }],
      ['两倍瑞利长度', '在 z ≈ 2.48 m 处，光束半径约为 2.24w₀。', 'params', { z: 2.48 }],
      ['远场位置', '在 z ≈ 6.2 m 处，光束进入远场并明显发散。', 'params', { z: 6.2 }],
      ['连续传播总结', '拖动图表观察光束从束腰到远场的完整扩散趋势。', 'initial']
    ]
  }
};

function beamSeries(params, name, maxDistance) {
  const result = calculateGaussianBeam(params.wavelength, params.waist, params.z);
  const data = Array.from({ length: 121 }, (_, index) => {
    const z = maxDistance * index / 120;
    const w = result.waistMeter * Math.sqrt(1 + (z / result.rayleighLength) ** 2);
    return [z, w * 1000];
  });
  return { name, type: 'line', data, smooth: true, showSymbol: false, lineStyle: { width: 2.5 } };
}

function makeChartOption(experiment, step, params) {
  if (!experiment || !step) {
    return { graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '请从左侧选择一个实验', fill: '#7b8794', fontSize: 16 } }] };
  }

  const result = calculateGaussianBeam(params.wavelength, params.waist, params.z);
  let series;
  if (step[2] === 'wavelengths') {
    series = step[3].map(lambda => {
      const local = { ...params, wavelength: lambda };
      const localResult = calculateGaussianBeam(lambda, params.waist, 0);
      return beamSeries(local, `${lambda} nm`, localResult.rayleighLength * 3);
    });
  } else if (step[2] === 'waists') {
    series = step[3].map(waist => {
      const local = { ...params, waist };
      const localResult = calculateGaussianBeam(params.wavelength, waist, 0);
      return beamSeries(local, `${waist} mm`, localResult.rayleighLength * 3);
    });
  } else {
    const maxDistance = Math.max(result.rayleighLength * 3, params.z * 1.15, 1);
    series = [beamSeries(params, '光束半径', maxDistance)];
    series[0].markLine = {
      symbol: 'none',
      data: [
        { xAxis: result.rayleighLength, name: 'zR', lineStyle: { color: '#f59e0b', type: 'dashed' } },
        ...(params.z > 0 ? [{ xAxis: params.z, name: '当前位置', lineStyle: { color: '#ef4444' } }] : [])
      ]
    };
  }

  return {
    color: ['#2db8ab', '#4f7cff', '#f59e0b'],
    tooltip: { trigger: 'axis' },
    legend: { top: 2 },
    grid: { left: 72, right: 28, top: 42, bottom: 58 },
    xAxis: { type: 'value', name: '传播距离 z (m)', nameLocation: 'middle', nameGap: 38, splitLine: { lineStyle: { color: '#eef1f4' } } },
    yAxis: { type: 'value', name: '光束半径 w(z) (mm)', splitLine: { lineStyle: { color: '#eef1f4' } } },
    series
  };
}

function saveRecord(experimentId, params) {
  const result = calculateGaussianBeam(params.wavelength, params.waist, params.z);
  const record = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    experimentId,
    timestamp: Date.now(),
    params: { ...params },
    results: { zR: result.rayleighLength, theta: result.divergenceAngle, beamRadius: result.beamRadius }
  };
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...records, record]));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record]));
  }
}

function downloadGuide() {
  const content = `高斯光束教学实验指导书\n\n一、实验目的\n1. 理解高斯光束基本特性\n2. 掌握瑞利长度和发散角的计算\n3. 分析波长、束腰和传播距离的影响\n\n二、基本公式\nzR = πw₀²/λ\nθ = λ/(πw₀)\nw(z) = w₀√(1+(z/zR)²)\n\n三、实验内容\n1. 波长对发散角的影响\n2. 束腰对瑞利长度的影响\n3. 传播距离对光束扩散的影响\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'application/msword;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = '高斯光束教学实验指导书.doc';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Experiment() {
  const [currentId, setCurrentId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [params, setParams] = useState({ wavelength: 632.8, waist: 0.5, z: 0 });
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState({});
  const [formulaOpen, setFormulaOpen] = useState(false);
  const savedRef = useRef(new Set());

  const experiment = currentId ? EXPERIMENTS[currentId] : null;
  const step = experiment?.steps[stepIndex] || null;

  useEffect(() => {
    if (step?.[2] === 'params') setParams(current => ({ ...current, ...step[3] }));
  }, [currentId, stepIndex, step]);

  useEffect(() => {
    if (!playing || !experiment) return undefined;
    const timer = window.setInterval(() => {
      setStepIndex(index => {
        if (index >= experiment.steps.length - 1) {
          setPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [playing, experiment]);

  useEffect(() => {
    if (!experiment || stepIndex !== experiment.steps.length - 1 || savedRef.current.has(currentId)) return;
    savedRef.current.add(currentId);
    setCompleted(current => ({ ...current, [currentId]: true }));
    saveRecord(currentId, params);
  }, [currentId, experiment, params, stepIndex]);

  const result = useMemo(() => calculateGaussianBeam(params.wavelength, params.waist, params.z), [params]);
  const chartOption = useMemo(() => makeChartOption(experiment, step, params), [experiment, step, params]);
  const chart = useEChart(chartOption);

  const chooseExperiment = id => {
    setPlaying(false);
    setCurrentId(id);
    setStepIndex(0);
    setParams({ ...EXPERIMENTS[id].initial });
  };

  return (
    <div className="lab-page experiment-page">
      <div className="lab-page-title action-title">
        <div><span className="eyebrow">GUIDED LAB</span><h1>🔬 教学实验模式</h1></div>
        <div className="title-actions"><Link className="lab-button secondary" to="/datacenter">📊 数据中心</Link><button className="lab-button primary" onClick={downloadGuide}>📥 实验指导书</button></div>
      </div>

      <div className="experiment-layout">
        <aside className="lab-card experiment-list">
          <h2>选择实验</h2>
          {Object.entries(EXPERIMENTS).map(([id, item]) => (
            <button key={id} className={`experiment-choice ${Number(id) === currentId ? 'active' : ''}`} onClick={() => chooseExperiment(Number(id))}>
              <span className="choice-number">{id}</span>
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <span className={`completion-dot ${completed[id] ? 'done' : ''}`}>{completed[id] ? '✓' : ''}</span>
            </button>
          ))}
          <div className="guide-note"><strong>📋 实验记录</strong><p>完成最后一步后，当前实验参数会自动写入数据中心。</p></div>
        </aside>

        <section className="lab-card experiment-workbench">
          <div className="workbench-header">
            <div><span>当前实验</span><h2>{experiment ? `实验${currentId}：${experiment.title}` : '请选择一个实验'}</h2></div>
            <span className="step-badge">步骤 {experiment ? stepIndex + 1 : 0}/{experiment?.steps.length || 0}</span>
          </div>
          <div ref={chart.elementRef} className="experiment-chart" />
          <div className="metric-row">
            <Metric label="波长 λ" value={`${params.wavelength} nm`} />
            <Metric label="束腰 w₀" value={`${params.waist} mm`} />
            <Metric label="距离 z" value={`${params.z.toFixed(2)} m`} />
            <Metric label="瑞利长度 zR" value={`${result.rayleighLength.toFixed(4)} m`} accent />
            <Metric label="发散角 θ" value={`${(result.divergenceAngle * 1000).toFixed(4)} mrad`} accent />
            <Metric label="光束半径 w(z)" value={`${(result.beamRadius * 1000).toFixed(3)} mm`} accent />
          </div>
          <div className="instruction-box"><span>步骤 {experiment ? stepIndex + 1 : 0}</span><div><strong>{step?.[0] || '等待选择'}</strong><p>{step?.[1] || '请从左侧选择一个教学实验开始。'}</p></div></div>
          <div className="experiment-actions">
            <button className="lab-button primary" disabled={!experiment || stepIndex >= experiment.steps.length - 1} onClick={() => setPlaying(value => !value)}>{playing ? '⏸ 暂停' : '▶ 自动播放'}</button>
            <button className="lab-button secondary" disabled={!experiment} onClick={() => { setPlaying(false); setStepIndex(0); setParams({ ...experiment.initial }); }}>↺ 重置</button>
            <button className="lab-button secondary" disabled={!experiment || stepIndex >= experiment.steps.length - 1} onClick={() => setStepIndex(index => index + 1)}>下一步 →</button>
          </div>
        </section>
      </div>

      <button className="formula-fab" onClick={() => setFormulaOpen(value => !value)}>📐</button>
      {formulaOpen && <aside className="formula-popover lab-card">
        <div className="popover-header"><strong>物理公式</strong><button onClick={() => setFormulaOpen(false)}>×</button></div>
        <div><span>瑞利长度</span><Formula>{'z_R=\\frac{\\pi w_0^2}{\\lambda}'}</Formula></div>
        <div><span>发散角</span><Formula>{'\\theta=\\frac{\\lambda}{\\pi w_0}'}</Formula></div>
        <div><span>光束半径</span><Formula>{'w(z)=w_0\\sqrt{1+(z/z_R)^2}'}</Formula></div>
      </aside>}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return <div className={`metric ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}
