import { useEffect, useMemo, useState } from 'react';
import useEChart from '../hooks/useEChart';
import { calculateGaussianBeam } from '../utils/gaussian';
import '../styles/lab-pages.css';

const STORAGE_KEY = 'laserExperimentRecords';
const EXPERIMENT_NAMES = {
  1: '波长对发散角的影响',
  2: '束腰对瑞利长度的影响',
  3: '传播距离对光束扩散的影响'
};

function normalizeRecord(record) {
  const params = record.params || record;
  const calculated = calculateGaussianBeam(Number(params.wavelength) || 632.8, Number(params.waist) || 0.5, Number(params.z) || 0);
  const results = record.results || {};
  return {
    id: record.id || `rec_${record.timestamp || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Number(record.timestamp) || Date.now(),
    experimentId: Number(record.experimentId) || 1,
    params: {
      wavelength: Number(params.wavelength) || 632.8,
      waist: Number(params.waist) || 0.5,
      z: Number(params.z) || 0
    },
    results: {
      zR: Number(results.zR ?? record.zR) || calculated.rayleighLength,
      theta: Number(results.theta ?? record.theta) || calculated.divergenceAngle,
      beamRadius: Number(results.beamRadius ?? record.beamRadius) || calculated.beamRadius
    }
  };
}

function readRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.map(normalizeRecord).sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch {
    return [];
  }
}

function chartBase(xName, yName, data, name) {
  if (!data.length) return { graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暂无数据', fill: '#94a3b8', fontSize: 16 } }] };
  return {
    color: ['#2db8ab'], tooltip: { trigger: 'axis' },
    grid: { left: 68, right: 28, top: 30, bottom: 58 },
    xAxis: { type: 'value', name: xName, nameLocation: 'middle', nameGap: 38, splitLine: { lineStyle: { color: '#eef1f4' } } },
    yAxis: { type: 'value', name: yName, splitLine: { lineStyle: { color: '#eef1f4' } } },
    series: [{ name, type: 'line', smooth: true, showSymbol: true, symbolSize: 7, data, lineStyle: { width: 2.5 }, areaStyle: { color: 'rgba(45,184,171,.08)' } }]
  };
}

function distributionOption(title, labels, values) {
  if (!values.some(Boolean)) return { graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暂无统计数据', fill: '#94a3b8' } }] };
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 13, color: '#475569' } },
    color: ['#4f7cff'], tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 16, top: 42, bottom: 34 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#eef1f4' } } },
    series: [{ type: 'bar', data: values, barMaxWidth: 30, itemStyle: { borderRadius: [5, 5, 0, 0] } }]
  };
}

function downloadText(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DataCenter() {
  const [records, setRecords] = useState(readRecords);
  const [curveType, setCurveType] = useState('zR_w0');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setRecords(readRecords());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const historyOption = useMemo(() => {
    const configs = {
      zR_w0: ['束腰 w₀ (mm)', '瑞利长度 zR (m)', record => [record.params.waist, record.results.zR], '瑞利长度'],
      theta_lambda: ['波长 λ (nm)', '发散角 θ (mrad)', record => [record.params.wavelength, record.results.theta * 1000], '发散角'],
      zR_lambda: ['波长 λ (nm)', '瑞利长度 zR (m)', record => [record.params.wavelength, record.results.zR], '瑞利长度'],
      theta_w0: ['束腰 w₀ (mm)', '发散角 θ (mrad)', record => [record.params.waist, record.results.theta * 1000], '发散角']
    };
    const [xName, yName, mapper, name] = configs[curveType];
    return chartBase(xName, yName, records.map(mapper).sort((a, b) => a[0] - b[0]), name);
  }, [curveType, records]);

  const waistDistribution = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    records.forEach(({ params }) => { buckets[params.waist < 0.3 ? 0 : params.waist < 0.6 ? 1 : params.waist < 1 ? 2 : 3] += 1; });
    return distributionOption('束腰分布', ['<0.3', '0.3–0.6', '0.6–1.0', '≥1.0'], buckets);
  }, [records]);

  const wavelengthDistribution = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    records.forEach(({ params }) => { buckets[params.wavelength < 500 ? 0 : params.wavelength < 700 ? 1 : params.wavelength < 900 ? 2 : 3] += 1; });
    return distributionOption('波长分布', ['<500', '500–700', '700–900', '≥900'], buckets);
  }, [records]);

  const historyChart = useEChart(historyOption);
  const waistChart = useEChart(waistDistribution);
  const wavelengthChart = useEChart(wavelengthDistribution);
  const selected = records.find(record => record.id === selectedId);
  const averageWaist = records.length ? records.reduce((sum, item) => sum + item.params.waist, 0) / records.length : null;

  const loadSamples = () => {
    const specs = [
      [1, 400, 0.5, 1], [1, 632.8, 0.5, 1], [1, 1000, 0.5, 1],
      [2, 632.8, 0.2, 1], [2, 632.8, 0.5, 1], [2, 632.8, 1, 1],
      [3, 632.8, 0.5, 2.48]
    ];
    const now = Date.now();
    const samples = specs.map(([experimentId, wavelength, waist, z], index) => {
      const result = calculateGaussianBeam(wavelength, waist, z);
      return normalizeRecord({
        id: `sample_${now}_${index}`, experimentId, timestamp: now - index * 3600000,
        params: { wavelength, waist, z },
        results: { zR: result.rayleighLength, theta: result.divergenceAngle, beamRadius: result.beamRadius }
      });
    });
    setRecords(samples);
  };

  const exportCsv = () => {
    const rows = [
      ['时间', '实验', '波长λ(nm)', '束腰w₀(mm)', '传播距离z(m)', '瑞利长度zR(m)', '发散角θ(mrad)', '光束半径w(z)(mm)'],
      ...records.map(record => [
        new Date(record.timestamp).toLocaleString('zh-CN'), EXPERIMENT_NAMES[record.experimentId],
        record.params.wavelength, record.params.waist, record.params.z,
        record.results.zR.toFixed(6), (record.results.theta * 1000).toFixed(6), (record.results.beamRadius * 1000).toFixed(6)
      ])
    ];
    const csv = `\ufeff${rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    downloadText(csv, '高斯光束实验数据.csv', 'text/csv;charset=utf-8');
  };

  return (
    <div className="lab-page data-center-page">
      <div className="lab-page-title action-title">
        <div><span className="eyebrow">LAB NOTEBOOK</span><h1>📊 实验数据中心</h1></div>
        <div className="title-actions">
          <button className="lab-button secondary" disabled={!records.length} onClick={exportCsv}>📥 导出全部数据</button>
          <button className="lab-button danger" disabled={!records.length} onClick={() => { if (window.confirm('确认清空全部实验记录？')) setRecords([]); }}>🗑 清空记录</button>
        </div>
      </div>

      <section className="stats-overview">
        <Stat icon="📋" value={new Set(records.map(item => item.experimentId)).size} label="实验类型" />
        <Stat icon="🔬" value={records.length} label="记录条数" />
        <Stat icon="⏱" value={records.length ? new Date(records[0].timestamp).toLocaleDateString('zh-CN') : '--'} label="最近记录" />
        <Stat icon="📈" value={averageWaist === null ? '--' : averageWaist.toFixed(3)} label="平均束腰 (mm)" />
      </section>

      <div className="data-layout">
        <div className="data-left-column">
          <section className="lab-card records-panel">
            <div className="section-heading"><h2>实验记录列表</h2><button className="lab-button secondary compact" onClick={loadSamples}>加载示例数据</button></div>
            {!records.length ? <div className="empty-panel"><strong>暂无实验记录</strong><span>完成教学实验或加载示例数据后，这里会显示记录。</span></div> :
              <div className="record-list">{records.map(record => (
                <button key={record.id} onClick={() => setSelectedId(record.id)}>
                  <span className="record-icon">{record.experimentId === 1 ? '🌈' : record.experimentId === 2 ? '🎯' : '📡'}</span>
                  <span><strong>{EXPERIMENT_NAMES[record.experimentId]}</strong><small>{new Date(record.timestamp).toLocaleString('zh-CN')}</small></span>
                  <span>查看 →</span>
                </button>
              ))}</div>}
          </section>

          <section className="lab-card table-panel">
            <h2>数据表格</h2>
            <div className="table-scroll"><table><thead><tr><th>时间</th><th>实验</th><th>λ (nm)</th><th>w₀ (mm)</th><th>zR (m)</th><th>θ (mrad)</th></tr></thead>
              <tbody>{records.map(record => <tr key={record.id}><td>{new Date(record.timestamp).toLocaleString('zh-CN')}</td><td>{EXPERIMENT_NAMES[record.experimentId]}</td><td>{record.params.wavelength}</td><td>{record.params.waist}</td><td>{record.results.zR.toFixed(4)}</td><td>{(record.results.theta * 1000).toFixed(4)}</td></tr>)}</tbody>
            </table></div>
          </section>
        </div>

        <div className="data-right-column">
          <section className="lab-card chart-card">
            <div className="chart-card-header"><h2>历史曲线</h2><select value={curveType} onChange={event => setCurveType(event.target.value)}><option value="zR_w0">瑞利长度 vs 束腰</option><option value="theta_lambda">发散角 vs 波长</option><option value="zR_lambda">瑞利长度 vs 波长</option><option value="theta_w0">发散角 vs 束腰</option></select></div>
            <div ref={historyChart.elementRef} className="history-chart" />
          </section>
          <section className="lab-card chart-card"><h2>统计分析</h2><div className="distribution-grid"><div ref={waistChart.elementRef} /><div ref={wavelengthChart.elementRef} /></div></section>
        </div>
      </div>

      {selected && <div className="record-modal-backdrop" onMouseDown={() => setSelectedId(null)}>
        <div className="record-modal lab-card" onMouseDown={event => event.stopPropagation()}>
          <div className="popover-header"><h2>记录详情</h2><button onClick={() => setSelectedId(null)}>×</button></div>
          <div className="record-detail-grid">
            <Metric label="实验" value={EXPERIMENT_NAMES[selected.experimentId]} />
            <Metric label="记录时间" value={new Date(selected.timestamp).toLocaleString('zh-CN')} />
            <Metric label="波长 λ" value={`${selected.params.wavelength} nm`} />
            <Metric label="束腰 w₀" value={`${selected.params.waist} mm`} />
            <Metric label="传播距离 z" value={`${selected.params.z} m`} />
            <Metric label="瑞利长度 zR" value={`${selected.results.zR.toFixed(6)} m`} />
            <Metric label="发散角 θ" value={`${(selected.results.theta * 1000).toFixed(6)} mrad`} />
            <Metric label="光束半径 w(z)" value={`${(selected.results.beamRadius * 1000).toFixed(6)} mm`} />
          </div>
          <div className="modal-actions"><button className="lab-button danger" onClick={() => { setRecords(current => current.filter(item => item.id !== selected.id)); setSelectedId(null); }}>删除记录</button><button className="lab-button secondary" onClick={() => setSelectedId(null)}>关闭</button></div>
        </div>
      </div>}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return <div className="lab-card stat-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
