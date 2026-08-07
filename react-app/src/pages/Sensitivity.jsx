import { useMemo, useState } from 'react';
import Formula from '../components/Formula';
import useEChart from '../hooks/useEChart';
import '../styles/lab-pages.css';

const COLORS = ['#2db8ab', '#4f7cff', '#f59e0b'];

function range(min, max, count) {
  const safeCount = Math.max(2, count);
  return Array.from({ length: safeCount }, (_, index) => min + ((max - min) * index) / (safeCount - 1));
}

function rayleighLength(wavelengthNm, waistMm) {
  return Math.PI * (waistMm * 1e-3) ** 2 / (wavelengthNm * 1e-9);
}

function divergenceAngle(wavelengthNm, waistMm) {
  return (wavelengthNm * 1e-9) / (Math.PI * waistMm * 1e-3) * 1000;
}

function makeOption({ xName, yName, series }) {
  return {
    animationDuration: 500,
    color: COLORS,
    tooltip: { trigger: 'axis', valueFormatter: value => Number(value).toPrecision(5) },
    legend: { top: 2, textStyle: { color: '#52606d' } },
    grid: { left: 68, right: 28, top: 44, bottom: 58 },
    xAxis: {
      type: 'value', name: xName, nameLocation: 'middle', nameGap: 38,
      axisLine: { lineStyle: { color: '#aeb8c4' } },
      splitLine: { lineStyle: { color: '#eef1f4' } }
    },
    yAxis: {
      type: 'value', name: yName,
      axisLine: { lineStyle: { color: '#aeb8c4' } },
      splitLine: { lineStyle: { color: '#eef1f4' } }
    },
    series: series.map(item => ({
      ...item,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5 }
    }))
  };
}

function downloadChart(chart, name) {
  if (!chart) return;
  const anchor = document.createElement('a');
  anchor.href = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' });
  anchor.download = `${name}.png`;
  anchor.click();
}

export default function Sensitivity() {
  const [analysisType, setAnalysisType] = useState('single');
  const [selected, setSelected] = useState(['w0-zR', 'lambda-zR', 'w0-theta']);
  const [draft, setDraft] = useState({
    lambdaMin: 400, lambdaMax: 1000, waistMin: 0.1, waistMax: 2,
    sampleCount: 50, fixedLambda: 632.8, fixedWaist: 0.5
  });
  const [params, setParams] = useState(draft);

  const charts = useMemo(() => {
    const count = Math.min(200, Math.max(10, Number(params.sampleCount) || 50));
    const waists = range(Number(params.waistMin), Number(params.waistMax), count);
    const wavelengths = range(Number(params.lambdaMin), Number(params.lambdaMax), count);
    const lambdaSeries = analysisType === 'dual'
      ? [Number(params.lambdaMin), (Number(params.lambdaMin) + Number(params.lambdaMax)) / 2, Number(params.lambdaMax)]
      : [Number(params.fixedLambda)];
    const waistSeries = analysisType === 'dual'
      ? [Number(params.waistMin), (Number(params.waistMin) + Number(params.waistMax)) / 2, Number(params.waistMax)]
      : [Number(params.fixedWaist)];

    return {
      w0zR: makeOption({
        xName: '束腰 w₀ (mm)', yName: '瑞利长度 zR (m)',
        series: lambdaSeries.map(lambda => ({ name: `λ = ${lambda.toFixed(1)} nm`, data: waists.map(waist => [waist, rayleighLength(lambda, waist)]) }))
      }),
      lambdaZR: makeOption({
        xName: '波长 λ (nm)', yName: '瑞利长度 zR (m)',
        series: waistSeries.map(waist => ({ name: `w₀ = ${waist.toFixed(2)} mm`, data: wavelengths.map(lambda => [lambda, rayleighLength(lambda, waist)]) }))
      }),
      w0Theta: makeOption({
        xName: '束腰 w₀ (mm)', yName: '发散角 θ (mrad)',
        series: lambdaSeries.map(lambda => ({ name: `λ = ${lambda.toFixed(1)} nm`, data: waists.map(waist => [waist, divergenceAngle(lambda, waist)]) }))
      })
    };
  }, [analysisType, params]);

  const w0zR = useEChart(charts.w0zR);
  const lambdaZR = useEChart(charts.lambdaZR);
  const w0Theta = useEChart(charts.w0Theta);

  const setValue = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const toggleCurve = curve => setSelected(current => current.includes(curve)
    ? current.filter(item => item !== curve)
    : [...current, curve]);

  const exportAll = () => {
    if (selected.includes('w0-zR')) downloadChart(w0zR.chartRef.current, 'waist-rayleigh-length');
    if (selected.includes('lambda-zR')) downloadChart(lambdaZR.chartRef.current, 'wavelength-rayleigh-length');
    if (selected.includes('w0-theta')) downloadChart(w0Theta.chartRef.current, 'waist-divergence-angle');
  };

  return (
    <div className="lab-page sensitivity-page">
      <div className="lab-page-title">
        <div><span className="eyebrow">PARAMETER STUDY</span><h1>📊 参数敏感性分析</h1></div>
        <p>用单变量或多曲线对比方式观察高斯光束参数之间的关系。</p>
      </div>

      <div className="sensitivity-layout">
        <aside className="lab-card lab-controls">
          <h2>分析设置</h2>
          <div className="segmented-control">
            {['single', 'dual'].map(type => (
              <button key={type} className={analysisType === type ? 'active' : ''} onClick={() => setAnalysisType(type)}>
                {type === 'single' ? '单变量分析' : '多曲线对比'}
              </button>
            ))}
          </div>

          <h3>显示曲线</h3>
          <div className="check-list">
            {[['w0-zR', 'w₀ - zR'], ['lambda-zR', 'λ - zR'], ['w0-theta', 'w₀ - θ']].map(([value, label]) => (
              <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => toggleCurve(value)} />{label}</label>
            ))}
          </div>

          <h3>参数范围</h3>
          <label className="field-label">波长 λ（nm）</label>
          <div className="range-pair">
            <input type="number" value={draft.lambdaMin} onChange={e => setValue('lambdaMin', e.target.value)} />
            <span>—</span>
            <input type="number" value={draft.lambdaMax} onChange={e => setValue('lambdaMax', e.target.value)} />
          </div>
          <label className="field-label">束腰 w₀（mm）</label>
          <div className="range-pair">
            <input type="number" step="0.1" value={draft.waistMin} onChange={e => setValue('waistMin', e.target.value)} />
            <span>—</span>
            <input type="number" step="0.1" value={draft.waistMax} onChange={e => setValue('waistMax', e.target.value)} />
          </div>
          <label className="field-label">采样点数</label>
          <input type="number" min="10" max="200" value={draft.sampleCount} onChange={e => setValue('sampleCount', e.target.value)} />

          {analysisType === 'single' && <>
            <h3>固定参数</h3>
            <label className="field-label">固定波长 λ（nm）</label>
            <input type="number" value={draft.fixedLambda} onChange={e => setValue('fixedLambda', e.target.value)} />
            <label className="field-label">固定束腰 w₀（mm）</label>
            <input type="number" step="0.1" value={draft.fixedWaist} onChange={e => setValue('fixedWaist', e.target.value)} />
          </>}

          <div className="stacked-actions">
            <button className="lab-button primary" onClick={() => setParams({ ...draft })}>开始分析</button>
            <button className="lab-button secondary" onClick={exportAll}>导出所选图表</button>
          </div>
        </aside>

        <section className="sensitivity-charts">
          <ChartCard title="w₀ - zR 关系曲线" visible={selected.includes('w0-zR')} chart={w0zR} name="waist-rayleigh-length" />
          <ChartCard title="λ - zR 关系曲线" visible={selected.includes('lambda-zR')} chart={lambdaZR} name="wavelength-rayleigh-length" />
          <ChartCard title="w₀ - θ 关系曲线" visible={selected.includes('w0-theta')} chart={w0Theta} name="waist-divergence-angle" />
          {selected.length === 0 && <div className="lab-card empty-panel">至少选择一条分析曲线。</div>}
        </section>
      </div>

      <section className="lab-card formula-strip">
        <div><span>瑞利长度</span><Formula>{'z_R = \\frac{\\pi w_0^2}{\\lambda}'}</Formula></div>
        <div><span>发散角</span><Formula>{'\\theta = \\frac{\\lambda}{\\pi w_0}'}</Formula></div>
        <div><span>光束半径</span><Formula>{'w(z)=w_0\\sqrt{1+(z/z_R)^2}'}</Formula></div>
      </section>
    </div>
  );
}

function ChartCard({ title, visible, chart, name }) {
  if (!visible) return null;
  return (
    <article className="lab-card chart-card">
      <div className="chart-card-header"><h2>{title}</h2><button onClick={() => downloadChart(chart.chartRef.current, name)}>📷 导出</button></div>
      <div ref={chart.elementRef} className="analysis-chart" />
    </article>
  );
}
