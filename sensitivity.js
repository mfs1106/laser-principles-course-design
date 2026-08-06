let w0zRChart, lambdaZChart, w0ThetaChart;
let analysisType = 'single';
let selectedCurves = ['w0-zR', 'lambda-zR', 'w0-theta'];

let infoPanel, isDragging = false, startX, startY, panelX, panelY;

function initCharts() {
  w0zRChart = echarts.init(document.getElementById('w0zRChart'));
  lambdaZChart = echarts.init(document.getElementById('lambdaZChart'));
  w0ThetaChart = echarts.init(document.getElementById('w0ThetaChart'));

  infoPanel = document.getElementById('infoPanel');
  initDragPanel();

  document.querySelectorAll('input[name="analysisType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      analysisType = e.target.value;
      generateCharts();
    });
  });

  document.querySelectorAll('input[name="curve"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      selectedCurves = Array.from(document.querySelectorAll('input[name="curve"]:checked'))
        .map(cb => cb.value);
      generateCharts();
    });
  });

  generateCharts();

  window.addEventListener('resize', () => {
    w0zRChart.resize();
    lambdaZChart.resize();
    w0ThetaChart.resize();
  });
}

function initDragPanel() {
  if (!infoPanel) return;

  infoPanel.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    panelX = infoPanel.offsetLeft;
    panelY = infoPanel.offsetTop;
    infoPanel.classList.add('dragging');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newX = panelX + dx;
    let newY = panelY + dy;

    const maxX = window.innerWidth - infoPanel.offsetWidth - 10;
    const maxY = window.innerHeight - infoPanel.offsetHeight - 10;
    newX = Math.max(10, Math.min(newX, maxX));
    newY = Math.max(10, Math.min(newY, maxY));

    infoPanel.style.left = newX + 'px';
    infoPanel.style.top = newY + 'px';
    infoPanel.style.bottom = 'auto';
    infoPanel.style.right = 'auto';
  }

  function onMouseUp() {
    isDragging = false;
    infoPanel.classList.remove('dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function generateCharts() {
  const lambdaMin = parseFloat(document.getElementById('lambdaMin').value) || 400;
  const lambdaMax = parseFloat(document.getElementById('lambdaMax').value) || 1000;
  const waistMin = parseFloat(document.getElementById('waistMin').value) || 0.1;
  const waistMax = parseFloat(document.getElementById('waistMax').value) || 2.0;
  const sampleCount = parseInt(document.getElementById('sampleCount').value) || 50;
  const fixedLambda = parseFloat(document.getElementById('fixedLambda').value) || 632.8;
  const fixedWaist = parseFloat(document.getElementById('fixedWaist').value) || 0.5;

  if (selectedCurves.includes('w0-zR')) {
    generateW0ZRChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedLambda);
  } else {
    w0zRChart.clear();
  }

  if (selectedCurves.includes('lambda-zR')) {
    generateLambdaZRChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedWaist);
  } else {
    lambdaZChart.clear();
  }

  if (selectedCurves.includes('w0-theta')) {
    generateW0ThetaChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedLambda);
  } else {
    w0ThetaChart.clear();
  }
}

function generateW0ZRChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedLambda) {
  const data = [];
  
  if (analysisType === 'single') {
    const lambdaMeter = fixedLambda * 1e-9;
    for (let i = 0; i <= sampleCount; i++) {
      const w0 = waistMin + (waistMax - waistMin) * i / sampleCount;
      const w0Meter = w0 * 1e-3;
      const zR = Math.PI * w0Meter * w0Meter / lambdaMeter;
      data.push([w0, zR]);
    }
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' },
        formatter: (params) => {
          const w0 = params[0].value[0].toFixed(3);
          const zR = params[0].value[1].toFixed(4);
          return `w0 = ${w0} mm\nzR = ${zR} m`;
        }
      },
      xAxis: {
        type: 'value',
        name: '束腰半径 w₀ (mm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '瑞利长度 zR (m)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        lineStyle: {
          color: '#42d7c8',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(66, 215, 200, 0.3)' },
            { offset: 1, color: 'rgba(66, 215, 200, 0.05)' }
          ])
        },
        symbol: 'none'
      }]
    };
    
    w0zRChart.setOption(option);
  } else {
    const series = [];
    const wavelengths = [400, 500, 632.8, 800, 1000];
    
    wavelengths.forEach(lambda => {
      const seriesData = [];
      const lambdaMeter = lambda * 1e-9;
      for (let i = 0; i <= sampleCount; i++) {
        const w0 = waistMin + (waistMax - waistMin) * i / sampleCount;
        const w0Meter = w0 * 1e-3;
        const zR = Math.PI * w0Meter * w0Meter / lambdaMeter;
        seriesData.push([w0, zR]);
      }
      
      series.push({
        name: `${lambda} nm`,
        type: 'line',
        data: seriesData,
        smooth: true,
        lineStyle: { width: 2 },
        symbol: 'none'
      });
    });
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      legend: {
        data: ['400 nm', '500 nm', '632.8 nm', '800 nm', '1000 nm'],
        textStyle: { color: '#555', fontSize: 10 },
        bottom: 0
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' }
      },
      xAxis: {
        type: 'value',
        name: '束腰半径 w₀ (mm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '瑞利长度 zR (m)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: series
    };
    
    w0zRChart.setOption(option);
  }
}

function generateLambdaZRChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedWaist) {
  const data = [];
  
  if (analysisType === 'single') {
    const w0Meter = fixedWaist * 1e-3;
    for (let i = 0; i <= sampleCount; i++) {
      const lambda = lambdaMin + (lambdaMax - lambdaMin) * i / sampleCount;
      const lambdaMeter = lambda * 1e-9;
      const zR = Math.PI * w0Meter * w0Meter / lambdaMeter;
      data.push([lambda, zR]);
    }
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' },
        formatter: (params) => {
          const lambda = params[0].value[0].toFixed(1);
          const zR = params[0].value[1].toFixed(4);
          return `lambda = ${lambda} nm\nzR = ${zR} m`;
        }
      },
      xAxis: {
        type: 'value',
        name: '波长 λ (nm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '瑞利长度 zR (m)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        lineStyle: {
          color: '#ff6b6b',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.05)' }
          ])
        },
        symbol: 'none'
      }]
    };
    
    lambdaZChart.setOption(option);
  } else {
    const series = [];
    const waists = [0.2, 0.5, 1.0, 1.5, 2.0];
    
    waists.forEach(w0 => {
      const seriesData = [];
      const w0Meter = w0 * 1e-3;
      for (let i = 0; i <= sampleCount; i++) {
        const lambda = lambdaMin + (lambdaMax - lambdaMin) * i / sampleCount;
        const lambdaMeter = lambda * 1e-9;
        const zR = Math.PI * w0Meter * w0Meter / lambdaMeter;
        seriesData.push([lambda, zR]);
      }
      
      series.push({
        name: `${w0} mm`,
        type: 'line',
        data: seriesData,
        smooth: true,
        lineStyle: { width: 2 },
        symbol: 'none'
      });
    });
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      legend: {
        data: ['0.2 mm', '0.5 mm', '1.0 mm', '1.5 mm', '2.0 mm'],
        textStyle: { color: '#555', fontSize: 10 },
        bottom: 0
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' }
      },
      xAxis: {
        type: 'value',
        name: '波长 λ (nm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '瑞利长度 zR (m)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: series
    };
    
    lambdaZChart.setOption(option);
  }
}

function generateW0ThetaChart(lambdaMin, lambdaMax, waistMin, waistMax, sampleCount, fixedLambda) {
  const data = [];
  
  if (analysisType === 'single') {
    const lambdaMeter = fixedLambda * 1e-9;
    for (let i = 0; i <= sampleCount; i++) {
      const w0 = waistMin + (waistMax - waistMin) * i / sampleCount;
      const w0Meter = w0 * 1e-3;
      const theta = lambdaMeter / (Math.PI * w0Meter) * 1000;
      data.push([w0, theta]);
    }
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' },
        formatter: (params) => {
          const w0 = params[0].value[0].toFixed(3);
          const theta = params[0].value[1].toFixed(4);
          return `w0 = ${w0} mm\ntheta = ${theta} mrad`;
        }
      },
      xAxis: {
        type: 'value',
        name: '束腰半径 w₀ (mm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '发散角 (mrad)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        lineStyle: {
          color: '#ffa502',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 165, 2, 0.3)' },
            { offset: 1, color: 'rgba(255, 165, 2, 0.05)' }
          ])
        },
        symbol: 'none'
      }]
    };
    
    w0ThetaChart.setOption(option);
  } else {
    const series = [];
    const wavelengths = [400, 500, 632.8, 800, 1000];
    
    wavelengths.forEach(lambda => {
      const seriesData = [];
      const lambdaMeter = lambda * 1e-9;
      for (let i = 0; i <= sampleCount; i++) {
        const w0 = waistMin + (waistMax - waistMin) * i / sampleCount;
        const w0Meter = w0 * 1e-3;
        const theta = lambdaMeter / (Math.PI * w0Meter) * 1000;
        seriesData.push([w0, theta]);
      }
      
      series.push({
        name: `${lambda} nm`,
        type: 'line',
        data: seriesData,
        smooth: true,
        lineStyle: { width: 2 },
        symbol: 'none'
      });
    });
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '8%',
        top: '12%',
        bottom: '15%'
      },
      legend: {
        data: ['400 nm', '500 nm', '632.8 nm', '800 nm', '1000 nm'],
        textStyle: { color: '#555', fontSize: 10 },
        bottom: 0
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#dde1e6',
        textStyle: { color: '#2c3e50' }
      },
      xAxis: {
        type: 'value',
        name: '束腰半径 w₀ (mm)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      yAxis: {
        type: 'value',
        name: '发散角 (mrad)',
        nameTextStyle: { color: '#555', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d0d5dd' } },
        axisLabel: { color: '#666', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
      },
      series: series
    };
    
    w0ThetaChart.setOption(option);
  }
}

function exportChart(chartId) {
  let chart;
  let filename;
  
  switch (chartId) {
    case 'w0zRChart':
      chart = w0zRChart;
      filename = 'w0-zR关系曲线.png';
      break;
    case 'lambdaZChart':
      chart = lambdaZChart;
      filename = 'lambda-zR关系曲线.png';
      break;
    case 'w0ThetaChart':
      chart = w0ThetaChart;
      filename = 'w0-theta关系曲线.png';
      break;
  }
  
  if (chart) {
    const url = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
}

function exportImages() {
  exportChart('w0zRChart');
  setTimeout(() => exportChart('lambdaZChart'), 500);
  setTimeout(() => exportChart('w0ThetaChart'), 1000);
}

function goBack() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', initCharts);