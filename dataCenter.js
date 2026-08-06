let historyChart, statsChart1, statsChart2;
let allRecords = [];
let currentRecordId = null;

const STORAGE_KEY = 'laserExperimentRecords';

const experimentNames = {
  1: '波长对发散角的影响',
  2: '束腰对瑞利长度的影响',
  3: '传播距离对光束扩散的影响'
};

function init() {
  loadRecords();
  initCharts();
  renderUI();
  setupAutoSave();

  window.addEventListener('resize', () => {
    if (historyChart) historyChart.resize();
    if (statsChart1) statsChart1.resize();
    if (statsChart2) statsChart2.resize();
  });
}

function loadRecords() {
  const stored = localStorage.getItem(STORAGE_KEY);
  allRecords = stored ? JSON.parse(stored) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
}

function setupAutoSave() {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      loadRecords();
      renderUI();
    }
  });

  setInterval(() => {
    loadRecords();
    renderUI();
  }, 2000);
}

function initCharts() {
  historyChart = echarts.init(document.getElementById('historyChart'));
  statsChart1 = echarts.init(document.getElementById('statsChart1'));
  statsChart2 = echarts.init(document.getElementById('statsChart2'));
}

function renderUI() {
  renderStats();
  renderRecordsList();
  renderTable();
  updateHistoryChart();
  updateStatsCharts();
}

function renderStats() {
  document.getElementById('totalExperiments').textContent = new Set(allRecords.map(r => r.experimentId)).size || 0;
  document.getElementById('totalRecords').textContent = allRecords.length;

  if (allRecords.length > 0) {
    const lastRecord = allRecords[allRecords.length - 1];
    const date = new Date(lastRecord.timestamp);
    document.getElementById('lastSession').textContent = formatDateShort(date);
  }

  if (allRecords.length > 0) {
    const avgWaist = allRecords.reduce((sum, r) => sum + r.params.waist, 0) / allRecords.length;
    document.getElementById('avgWaist').textContent = avgWaist.toFixed(3);
  }
}

function renderRecordsList() {
  const container = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');

  if (allRecords.length === 0) {
    emptyState.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(emptyState);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  const sortedRecords = [...allRecords].reverse();
  container.innerHTML = sortedRecords.map(record => `
    <div class="record-item" onclick="showRecordDetail('${record.id}')">
      <div class="record-info">
        <div class="record-title">${experimentNames[record.experimentId] || '实验' + record.experimentId}</div>
        <div class="record-meta">${formatDateTime(new Date(record.timestamp))}</div>
      </div>
      <div class="record-params">
        <span>λ:${record.params.wavelength}nm</span>
        <span>w₀:${record.params.waist}mm</span>
      </div>
    </div>
  `).join('');
}

function renderTable() {
  const tbody = document.getElementById('tableBody');

  if (allRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = allRecords.map(record => {
    const date = new Date(record.timestamp);
    return `
      <tr onclick="showRecordDetail('${record.id}')">
        <td>${formatDateTime(date)}</td>
        <td>${experimentNames[record.experimentId] || '实验' + record.experimentId}</td>
        <td>${record.params.wavelength}</td>
        <td>${record.params.waist}</td>
        <td>${record.results.zR.toFixed(4)}</td>
        <td>${(record.results.theta * 1000).toFixed(4)}</td>
      </tr>
    `;
  }).join('');
}

function updateHistoryChart() {
  const curveType = document.getElementById('curveType').value;
  let xData = [], xLabel = '', yLabel = '';
  let defaultLambda = 632.8;
  let defaultWaist = 0.5;

  allRecords.forEach(record => {
    let x, y;
    switch (curveType) {
      case 'zR_w0':
        x = record.params.waist;
        y = record.results.zR;
        xLabel = '束腰 w₀ (mm)';
        yLabel = '瑞利长度 zR (m)';
        defaultLambda = record.params.wavelength;
        break;
      case 'theta_lambda':
        x = record.params.wavelength;
        y = record.results.theta * 1000;
        xLabel = '波长 λ (nm)';
        yLabel = '发散角 θ (mrad)';
        defaultWaist = record.params.waist;
        break;
      case 'zR_lambda':
        x = record.params.wavelength;
        y = record.results.zR;
        xLabel = '波长 λ (nm)';
        yLabel = '瑞利长度 zR (m)';
        defaultWaist = record.params.waist;
        break;
      case 'theta_w0':
        x = record.params.waist;
        y = record.results.theta * 1000;
        xLabel = '束腰 w₀ (mm)';
        yLabel = '发散角 θ (mrad)';
        defaultLambda = record.params.wavelength;
        break;
    }
    xData.push([x, y]);
  });

  xData.sort((a, b) => a[0] - b[0]);

  const xMin = xData.length > 0 ? Math.min(...xData.map(d => d[0])) * 0.9 : 0.1;
  const xMax = xData.length > 0 ? Math.max(...xData.map(d => d[0])) * 1.1 : 1;

  const theoryCurve = [];
  const points = 100;
  for (let i = 0; i <= points; i++) {
    const x = xMin + (xMax - xMin) * (i / points);
    let y;
    switch (curveType) {
      case 'zR_w0':
        const waistMeter = x * 1e-3;
        const lambdaMeter = defaultLambda * 1e-9;
        y = Math.PI * waistMeter * waistMeter / lambdaMeter;
        break;
      case 'theta_lambda':
        const lambdaMeter2 = x * 1e-9;
        const waistMeter2 = defaultWaist * 1e-3;
        y = (lambdaMeter2 / (Math.PI * waistMeter2)) * 1000;
        break;
      case 'zR_lambda':
        const waistMeter3 = defaultWaist * 1e-3;
        const lambdaMeter3 = x * 1e-9;
        y = Math.PI * waistMeter3 * waistMeter3 / lambdaMeter3;
        break;
      case 'theta_w0':
        const waistMeter4 = x * 1e-3;
        const lambdaMeter4 = defaultLambda * 1e-9;
        y = (lambdaMeter4 / (Math.PI * waistMeter4)) * 1000;
        break;
    }
    theoryCurve.push([x, y]);
  }

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '12%',
      right: '8%',
      top: '10%',
      bottom: '15%'
    },
    legend: {
      data: ['实验数据', '理论曲线'],
      textStyle: { color: '#555', fontSize: 11 },
      top: '5%',
      right: '8%'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#dde1e6',
      textStyle: { color: '#2c3e50' },
      formatter: (params) => {
        let result = `${xLabel.split(' ')[0]} = ${params[0].value[0].toFixed(3)}<br/>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value[1].toFixed(4)}<br/>`;
        });
        return result;
      }
    },
    xAxis: {
      type: 'value',
      name: xLabel,
      nameTextStyle: { color: '#555', fontSize: 10 },
      axisLine: { lineStyle: { color: '#d0d5dd' } },
      axisLabel: { color: '#666', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      min: xMin,
      max: xMax
    },
    yAxis: {
      type: 'value',
      name: yLabel,
      nameTextStyle: { color: '#555', fontSize: 10 },
      axisLine: { lineStyle: { color: '#d0d5dd' } },
      axisLabel: { color: '#666', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
    },
    series: [
      {
        name: '实验数据',
        type: 'scatter',
        data: xData,
        symbolSize: 12,
        itemStyle: {
          color: '#ff6b6b',
          borderColor: '#e55555',
          borderWidth: 2
        }
      },
      {
        name: '理论曲线',
        type: 'line',
        data: theoryCurve,
        symbol: 'none',
        lineStyle: {
          color: '#42d7c8',
          width: 2,
          type: 'solid'
        },
        smooth: false
      }
    ]
  };

  historyChart.setOption(option);
}

function updateStatsCharts() {
  updateWaistDistribution();
  updateWavelengthDistribution();
}

function updateWaistDistribution() {
  const waists = allRecords.map(r => r.params.waist);
  const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0];
  const counts = new Array(bins.length - 1).fill(0);

  waists.forEach(w => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (w >= bins[i] && w < bins[i + 1]) {
        counts[i]++;
        break;
      }
    }
  });

  const option = {
    backgroundColor: 'transparent',
    grid: { left: '15%', right: '10%', top: '10%', bottom: '20%' },
    xAxis: {
      type: 'category',
      data: bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`),
      axisLabel: { color: '#666', fontSize: 8, rotate: 45 },
      axisLine: { lineStyle: { color: '#d0d5dd' } }
    },
    yAxis: {
      type: 'value',
      name: '次数',
      nameTextStyle: { color: '#555', fontSize: 9 },
      axisLabel: { color: '#666', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
    },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#42d7c8' },
          { offset: 1, color: '#1a8a7e' }
        ])
      }
    }]
  };

  statsChart1.setOption(option);
}

function updateWavelengthDistribution() {
  const wavelengths = allRecords.map(r => r.params.wavelength);
  const bins = [300, 400, 500, 600, 700, 800, 1000, 1100];
  const counts = new Array(bins.length - 1).fill(0);

  wavelengths.forEach(w => {
    for (let i = 0; i < bins.length - 1; i++) {
      if (w >= bins[i] && w < bins[i + 1]) {
        counts[i]++;
        break;
      }
    }
  });

  const option = {
    backgroundColor: 'transparent',
    grid: { left: '15%', right: '10%', top: '10%', bottom: '20%' },
    xAxis: {
      type: 'category',
      data: bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`),
      axisLabel: { color: '#666', fontSize: 8, rotate: 45 },
      axisLine: { lineStyle: { color: '#d0d5dd' } }
    },
    yAxis: {
      type: 'value',
      name: '次数',
      nameTextStyle: { color: '#555', fontSize: 9 },
      axisLabel: { color: '#666', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
    },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ffaa44' },
          { offset: 1, color: '#cc7722' }
        ])
      }
    }]
  };

  statsChart2.setOption(option);
}

function showRecordDetail(id) {
  currentRecordId = id;
  const record = allRecords.find(r => r.id === id);
  if (!record) return;

  const date = new Date(record.timestamp);
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">实验名称</span>
      <span class="detail-value">${experimentNames[record.experimentId] || '实验' + record.experimentId}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">实验时间</span>
      <span class="detail-value">${formatDateTime(date)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">波长 λ</span>
      <span class="detail-value">${record.params.wavelength} nm</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">束腰 w₀</span>
      <span class="detail-value">${record.params.waist} mm</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">传播距离 z</span>
      <span class="detail-value">${record.params.z.toFixed(3)} m</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">瑞利长度 zR</span>
      <span class="detail-value">${record.results.zR.toFixed(4)} m</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">发散角 θ</span>
      <span class="detail-value">${(record.results.theta * 1000).toFixed(4)} mrad</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">光束半径 w(z)</span>
      <span class="detail-value">${(record.results.beamRadius * 1000).toFixed(3)} mm</span>
    </div>
  `;

  document.getElementById('recordModal').classList.add('active');
}

function closeModal() {
  document.getElementById('recordModal').classList.remove('active');
  currentRecordId = null;
}

function deleteRecord() {
  if (!currentRecordId) return;

  if (confirm('确定要删除这条记录吗？')) {
    allRecords = allRecords.filter(r => r.id !== currentRecordId);
    saveRecords();
    renderUI();
    closeModal();
  }
}

function clearAllData() {
  if (allRecords.length === 0) {
    alert('暂无数据可清空');
    return;
  }

  if (confirm('确定要清空所有实验记录吗？此操作不可恢复！')) {
    allRecords = [];
    saveRecords();
    renderUI();
  }
}

function exportAllCSV() {
  if (allRecords.length === 0) {
    alert('暂无数据可导出');
    return;
  }

  const headers = ['时间', '实验名称', '波长λ(nm)', '束腰w₀(mm)', '传播距离z(m)', '瑞利长度zR(m)', '发散角θ(mrad)', '光束半径w(z)(mm)'];
  const rows = allRecords.map(record => [
    formatDateTime(new Date(record.timestamp)),
    experimentNames[record.experimentId] || '实验' + record.experimentId,
    record.params.wavelength,
    record.params.waist,
    record.params.z.toFixed(4),
    record.results.zR.toFixed(6),
    (record.results.theta * 1000).toFixed(6),
    (record.results.beamRadius * 1000).toFixed(6)
  ]);

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `激光原理实验数据_${formatDateShort(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadSampleData() {
  const sampleRecords = [
    {
      id: generateId(),
      experimentId: 1,
      timestamp: Date.now() - 86400000 * 3,
      params: { wavelength: 400, waist: 0.5, z: 1.0 },
      results: calculateResults(400, 0.5, 1.0)
    },
    {
      id: generateId(),
      experimentId: 1,
      timestamp: Date.now() - 86400000 * 2,
      params: { wavelength: 632.8, waist: 0.5, z: 1.0 },
      results: calculateResults(632.8, 0.5, 1.0)
    },
    {
      id: generateId(),
      experimentId: 1,
      timestamp: Date.now() - 86400000,
      params: { wavelength: 1000, waist: 0.5, z: 1.0 },
      results: calculateResults(1000, 0.5, 1.0)
    },
    {
      id: generateId(),
      experimentId: 2,
      timestamp: Date.now() - 43200000,
      params: { wavelength: 632.8, waist: 0.2, z: 0.2 },
      results: calculateResults(632.8, 0.2, 0.2)
    },
    {
      id: generateId(),
      experimentId: 2,
      timestamp: Date.now() - 21600000,
      params: { wavelength: 632.8, waist: 0.5, z: 1.24 },
      results: calculateResults(632.8, 0.5, 1.24)
    },
    {
      id: generateId(),
      experimentId: 2,
      timestamp: Date.now() - 7200000,
      params: { wavelength: 632.8, waist: 1.0, z: 5.0 },
      results: calculateResults(632.8, 1.0, 5.0)
    },
    {
      id: generateId(),
      experimentId: 3,
      timestamp: Date.now() - 3600000,
      params: { wavelength: 632.8, waist: 0.5, z: 0 },
      results: calculateResults(632.8, 0.5, 0)
    },
    {
      id: generateId(),
      experimentId: 3,
      timestamp: Date.now() - 1800000,
      params: { wavelength: 632.8, waist: 0.5, z: 1.24 },
      results: calculateResults(632.8, 0.5, 1.24)
    },
    {
      id: generateId(),
      experimentId: 3,
      timestamp: Date.now(),
      params: { wavelength: 632.8, waist: 0.75, z: 2.5 },
      results: calculateResults(632.8, 0.75, 2.5)
    }
  ];

  allRecords = [...sampleRecords, ...allRecords];
  saveRecords();
  renderUI();
}

function calculateResults(wavelength, waist, z) {
  const lambdaMeter = wavelength * 1e-9;
  const waistMeter = waist * 1e-3;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
  const theta = lambdaMeter / (Math.PI * waistMeter);
  const beamRadius = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));

  return { zR, theta, beamRadius };
}

function generateId() {
  return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDateTime(date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateShort(date) {
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function goBack() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);