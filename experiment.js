let expChart;
let currentExperiment = 0;
let currentStep = 0;
let isPlaying = false;
let playInterval = null;
let completedExperiments = {};

const experiments = {
  1: {
    title: '实验1：波长对发散角的影响',
    description: '观察不同波长激光束的发散角变化',
    params: {
      waist: 0.5,
      wavelength: 632.8,
      z: 1.0
    },
    steps: [
      {
        title: '实验原理',
        instruction: '发散角 θ 与波长 λ 成正比，与束腰 w₀ 成反比。公式：θ = λ/(πw₀)。当束腰固定时，波长越大，发散角越大。',
        action: 'showInitial'
      },
      {
        title: '设置束腰',
        instruction: '首先固定束腰 w₀ = 0.5mm，这是一个典型的激光束腰大小。接下来我们观察不同波长下的发散角变化。',
        action: 'setWaist',
        param: { waist: 0.5 }
      },
      {
        title: '短波长演示 (λ = 400nm)',
        instruction: '使用蓝光 (λ = 400nm)。可以看到发散角较小，光束方向性好。计算得 θ ≈ 0.255 mrad',
        action: 'animateWavelength',
        param: { wavelength: 400 }
      },
      {
        title: '中波长演示 (λ = 632.8nm)',
        instruction: '使用红光 (λ = 632.8nm)，这是He-Ne激光器的典型波长。发散角增大到 θ ≈ 0.403 mrad',
        action: 'animateWavelength',
        param: { wavelength: 632.8 }
      },
      {
        title: '长波长演示 (λ = 1000nm)',
        instruction: '使用近红外光 (λ = 1000nm)。发散角显著增大到 θ ≈ 0.637 mrad，是蓝光时的2.5倍！',
        action: 'animateWavelength',
        param: { wavelength: 1000 }
      },
      {
        title: '对比总结',
        instruction: '波长从 400nm 增加到 1000nm（2.5倍），发散角也从 0.255 mrad 增加到 0.637 mrad（2.5倍）。结论：发散角与波长成正比。',
        action: 'compareAll',
        params: { wavelengths: [400, 632.8, 1000] }
      }
    ]
  },
  2: {
    title: '实验2：束腰对瑞利长度的影响',
    description: '观察不同束腰大小对瑞利长度的影响',
    params: {
      waist: 0.5,
      wavelength: 632.8,
      z: 1.0
    },
    steps: [
      {
        title: '实验原理',
        instruction: '瑞利长度 zR 表示光束近似的直线传播距离，与束腰的平方成正比，与波长成反比。公式：zR = πw₀²/λ',
        action: 'showInitial'
      },
      {
        title: '设置波长',
        instruction: '首先固定波长 λ = 632.8nm（He-Ne激光器典型值）。接下来观察不同束腰下的瑞利长度变化。',
        action: 'setWavelength',
        param: { wavelength: 632.8 }
      },
      {
        title: '小束腰演示 (w₀ = 0.2mm)',
        instruction: '使用小束腰 w₀ = 0.2mm。瑞利长度较短，光束很快开始扩散。计算得 zR ≈ 0.198 m',
        action: 'animateWaist',
        param: { waist: 0.2 }
      },
      {
        title: '中束腰演示 (w₀ = 0.5mm)',
        instruction: '使用中等束腰 w₀ = 0.5mm。这是实验室常用配置。瑞利长度增加，zR ≈ 1.242 m',
        action: 'animateWaist',
        param: { waist: 0.5 }
      },
      {
        title: '大束腰演示 (w₀ = 1.0mm)',
        instruction: '使用大束腰 w₀ = 1.0mm。瑞利长度显著增加，zR ≈ 4.967 m，光束可以在更远距离保持近平行',
        action: 'animateWaist',
        param: { waist: 1.0 }
      },
      {
        title: '对比总结',
        instruction: '束腰从 0.2mm 增加到 1.0mm（5倍），瑞利长度从 0.198m 增加到 4.967m（约25倍）。结论：瑞利长度与束腰平方成正比。',
        action: 'compareAll',
        params: { waists: [0.2, 0.5, 1.0] }
      }
    ]
  },
  3: {
    title: '实验3：传播距离对光束扩散的影响',
    description: '观察光束随传播距离的扩散变化',
    params: {
      waist: 0.5,
      wavelength: 632.8,
      z: 0
    },
    steps: [
      {
        title: '实验原理',
        instruction: '光束半径随传播距离变化：w(z) = w₀√(1+(z/zR)²)。在 z=0 处束腰最小，z=zR 处光束半径为 √2w₀，之后快速扩散。',
        action: 'showInitial'
      },
      {
        title: '设置参数',
        instruction: '设置 λ = 632.8nm，w₀ = 0.5mm。此时瑞利长度 zR ≈ 1.24m。我们将观察光束从束腰位置开始的扩散过程。',
        action: 'setParams',
        param: { wavelength: 632.8, waist: 0.5 }
      },
      {
        title: '观察束腰位置 (z = 0)',
        instruction: '在 z = 0 处，光束半径等于束腰 w₀ = 0.5mm。这是光束最细的位置。',
        action: 'animateZ',
        param: { z: 0 }
      },
      {
        title: '观察瑞利长度位置 (z = zR)',
        instruction: '在 z = zR ≈ 1.24m 处，光束半径 w(z) = √2 × w₀ ≈ 0.707mm。光束开始明显扩散。',
        action: 'animateZ',
        param: { z: 1.24 }
      },
      {
        title: '观察远场 (z = 2zR)',
        instruction: '在 z = 2zR ≈ 2.48m 处，光束半径约为 w₀的2.24倍。光束已明显扩散，发散角基本保持恒定。',
        action: 'animateZ',
        param: { z: 2.48 }
      },
      {
        title: '观察更远距离 (z = 5zR)',
        instruction: '在 z = 5zR ≈ 6.2m 处，光束半径约为 w₀的5.1倍。此时光束已经严重扩散，远场特性明显。',
        action: 'animateZ',
        param: { z: 6.2 }
      },
      {
        title: '连续动画演示',
        instruction: '现在让我们观看光束从束腰位置连续传播到远场的完整过程。注意光束如何从近平行逐渐变为快速扩散。',
        action: 'continuousAnimation'
      }
    ]
  }
};

const DATA_CENTER_KEY = 'laserExperimentRecords';

function init() {
  expChart = echarts.init(document.getElementById('expChart'));

  window.addEventListener('resize', () => {
    expChart.resize();
  });

  updateButtons();

  document.querySelectorAll('.experiment-item').forEach(item => {
    item.addEventListener('click', () => {
      const expId = parseInt(item.dataset.exp);
      selectExperiment(expId);
    });
  });
}

function selectExperiment(expId) {
  if (isPlaying) {
    pauseExperiment();
  }

  currentExperiment = expId;
  currentStep = 0;

  document.querySelectorAll('.experiment-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.dataset.exp) === expId) {
      item.classList.add('active');
    }
  });

  const exp = experiments[expId];
  document.getElementById('currentExpTitle').textContent = exp.title;
  document.getElementById('stepIndicator').textContent = `步骤 ${currentStep}/${exp.steps.length}`;

  displayStep(0);
  updateButtons();
  drawInitialChart();
}

function displayStep(stepIndex) {
  const exp = experiments[currentExperiment];
  if (!exp || stepIndex >= exp.steps.length) return;

  const step = exp.steps[stepIndex];
  document.getElementById('currentStep').textContent = stepIndex + 1;
  document.getElementById('instructionText').textContent = step.instruction;
  document.getElementById('stepIndicator').textContent = `步骤 ${stepIndex + 1}/${exp.steps.length}`;

  updateParamsDisplay(exp.params);

  executeStepAction(step);
}

function executeStepAction(step) {
  switch (step.action) {
    case 'showInitial':
      drawInitialChart();
      break;
    case 'setWaist':
      updateExperimentParams(step.param);
      drawSingleCurve();
      break;
    case 'setWavelength':
      updateExperimentParams(step.param);
      drawSingleCurve();
      break;
    case 'setParams':
      updateExperimentParams(step.param);
      drawSingleCurve();
      break;
    case 'animateWavelength':
      animateWavelengthChange(step.param.wavelength);
      break;
    case 'animateWaist':
      animateWaistChange(step.param.waist);
      break;
    case 'animateZ':
      animateZChange(step.param.z);
      break;
    case 'compareAll':
      if (step.params.wavelengths) {
        drawWavelengthComparison(step.params.wavelengths);
      } else if (step.params.waists) {
        drawWaistComparison(step.params.waists);
      }
      break;
    case 'continuousAnimation':
      startContinuousAnimation();
      break;
  }
}

function updateExperimentParams(params) {
  const exp = experiments[currentExperiment];
  Object.assign(exp.params, params);
}

function updateParamsDisplay(params) {
  const wavelength = params.wavelength || experiments[currentExperiment].params.wavelength;
  const waist = params.waist || experiments[currentExperiment].params.waist;
  const z = params.z !== undefined ? params.z : experiments[currentExperiment].params.z;

  const wavelengthMeter = wavelength * 1e-9;
  const waistMeter = waist * 1e-3;
  const rayleighLength = Math.PI * waistMeter * waistMeter / wavelengthMeter;
  const divergence = wavelengthMeter / (Math.PI * waistMeter);
  const beamRadius = waistMeter * Math.sqrt(1 + Math.pow(z / rayleighLength, 2));

  document.getElementById('displayLambda').textContent = wavelength + ' nm';
  document.getElementById('displayWaist').textContent = waist + ' mm';
  document.getElementById('displayZ').textContent = z.toFixed(2) + ' m';
  document.getElementById('displayZR').textContent = rayleighLength.toFixed(4) + ' m';
  document.getElementById('displayTheta').textContent = (divergence * 1000).toFixed(4) + ' mrad';
  document.getElementById('displayWZ').textContent = (beamRadius * 1000).toFixed(3) + ' mm';
}

function drawInitialChart() {
  const exp = experiments[currentExperiment];
  const params = exp.params;

  const wavelengthMeter = params.wavelength * 1e-9;
  const waistMeter = params.waist * 1e-3;
  const rayleighLength = Math.PI * waistMeter * waistMeter / wavelengthMeter;

  const chartData = [];
  const maxZ = rayleighLength * 3;

  for (let i = 0; i <= 100; i++) {
    const z = (i / 100) * maxZ;
    const wz = waistMeter * Math.sqrt(1 + Math.pow(z / rayleighLength, 2));
    chartData.push([z, wz * 1000]);
  }

  const option = {
    backgroundColor: 'transparent',
    grid: {
      left: '10%',
      right: '8%',
      top: '8%',
      bottom: '15%'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#dde1e6',
      textStyle: { color: '#2c3e50' },
      formatter: (params) => {
        const z = params[0].value[0].toFixed(3);
        const w = params[0].value[1].toFixed(3);
        return `z = ${z} m\nw(z) = ${w} mm`;
      }
    },
    xAxis: {
      type: 'value',
      name: '传播距离 z (m)',
      nameTextStyle: { color: '#555', fontSize: 11 },
      axisLine: { lineStyle: { color: '#d0d5dd' } },
      axisLabel: { color: '#666', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
    },
    yAxis: {
      type: 'value',
      name: '光束半径 w(z) (mm)',
      nameTextStyle: { color: '#555', fontSize: 11 },
      axisLine: { lineStyle: { color: '#d0d5dd' } },
      axisLabel: { color: '#666', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
    },
    series: [{
      type: 'line',
      data: chartData,
      smooth: true,
      lineStyle: { color: '#42d7c8', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(66, 215, 200, 0.25)' },
          { offset: 1, color: 'rgba(66, 215, 200, 0.03)' }
        ])
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#e67e22', type: 'dashed', width: 1 },
        data: [
          { xAxis: rayleighLength, label: { formatter: 'zR', color: '#e67e22' } }
        ]
      },
      symbol: 'none'
    }]
  };

  expChart.setOption(option);
}

function drawSingleCurve() {
  drawInitialChart();
  const params = experiments[currentExperiment].params;
  updateParamsDisplay(params);
}

function animateWavelengthChange(targetWavelength) {
  const exp = experiments[currentExperiment];
  const waist = exp.params.waist;
  const waistMeter = waist * 1e-3;

  const targetZR = Math.PI * waistMeter * waistMeter / (targetWavelength * 1e-9);
  const maxZ = targetZR * 3;

  const chartData = [];
  for (let i = 0; i <= 100; i++) {
    const z = (i / 100) * maxZ;
    const wz = waistMeter * Math.sqrt(1 + Math.pow(z / targetZR, 2));
    chartData.push([z, wz * 1000]);
  }

  const rayleighLength = Math.PI * waistMeter * waistMeter / (targetWavelength * 1e-9);

  const option = {
    series: [{
      data: chartData,
      markLine: {
        data: [
          { xAxis: rayleighLength, label: { formatter: 'zR', color: '#ffaa44' } }
        ]
      }
    }]
  };

  expChart.setOption(option);

  const params = { wavelength: targetWavelength, waist: waist, z: rayleighLength };
  updateParamsDisplay(params);
}

function animateWaistChange(targetWaist) {
  const exp = experiments[currentExperiment];
  const wavelength = exp.params.wavelength;
  const wavelengthMeter = wavelength * 1e-9;
  const waistMeter = targetWaist * 1e-3;

  const targetZR = Math.PI * waistMeter * waistMeter / wavelengthMeter;
  const maxZ = targetZR * 3;

  const chartData = [];
  for (let i = 0; i <= 100; i++) {
    const z = (i / 100) * maxZ;
    const wz = waistMeter * Math.sqrt(1 + Math.pow(z / targetZR, 2));
    chartData.push([z, wz * 1000]);
  }

  const option = {
    series: [{
      data: chartData,
      markLine: {
        data: [
          { xAxis: targetZR, label: { formatter: 'zR', color: '#ffaa44' } }
        ]
      }
    }]
  };

  expChart.setOption(option);

  const params = { wavelength: wavelength, waist: targetWaist, z: targetZR };
  updateParamsDisplay(params);
}

function animateZChange(targetZ) {
  const exp = experiments[currentExperiment];
  const params = { ...exp.params, z: targetZ };
  updateParamsDisplay(params);

  expChart.setOption({
    series: [{
      markLine: {
        data: [
          { xAxis: targetZ, label: { formatter: 'z', color: '#e67e22' }, lineStyle: { color: '#e74c3c' } }
        ]
      }
    }]
  });
}

function drawWavelengthComparison(wavelengths) {
  const exp = experiments[currentExperiment];
  const waist = exp.params.waist;
  const waistMeter = waist * 1e-3;

  const series = wavelengths.map(lambda => {
    const zR = Math.PI * waistMeter * waistMeter / (lambda * 1e-9);
    const maxZ = zR * 3;
    const data = [];

    for (let i = 0; i <= 100; i++) {
      const z = (i / 100) * maxZ;
      const wz = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      data.push([z, wz * 1000]);
    }

    return {
      name: `${lambda} nm`,
      type: 'line',
      data: data,
      smooth: true,
      lineStyle: { width: 2 },
      symbol: 'none'
    };
  });

  const option = {
    legend: {
      data: wavelengths.map(l => `${l} nm`),
      textStyle: { color: '#555', fontSize: 10 },
      bottom: 0
    },
    series: series
  };

  expChart.setOption(option);

  const params = { wavelength: wavelengths[1], waist: waist, z: 1 };
  updateParamsDisplay(params);
}

function drawWaistComparison(waists) {
  const exp = experiments[currentExperiment];
  const wavelength = exp.params.wavelength;
  const wavelengthMeter = wavelength * 1e-9;

  const series = waists.map(waist => {
    const waistMeter = waist * 1e-3;
    const zR = Math.PI * waistMeter * waistMeter / wavelengthMeter;
    const maxZ = zR * 3;
    const data = [];

    for (let i = 0; i <= 100; i++) {
      const z = (i / 100) * maxZ;
      const wz = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
      data.push([z, wz * 1000]);
    }

    return {
      name: `${waist} mm`,
      type: 'line',
      data: data,
      smooth: true,
      lineStyle: { width: 2 },
      symbol: 'none'
    };
  });

  const option = {
    legend: {
      data: waists.map(w => `${w} mm`),
      textStyle: { color: '#555', fontSize: 10 },
      bottom: 0
    },
    series: series
  };

  expChart.setOption(option);

  const params = { wavelength: wavelength, waist: waists[1], z: 1 };
  updateParamsDisplay(params);
}

function startContinuousAnimation() {
  const exp = experiments[currentExperiment];
  const params = exp.params;
  const wavelengthMeter = params.wavelength * 1e-9;
  const waistMeter = params.waist * 1e-3;
  const rayleighLength = Math.PI * waistMeter * waistMeter / wavelengthMeter;
  const maxZ = rayleighLength * 3;

  let currentZ = 0;
  const step = 0.02;

  playInterval = setInterval(() => {
    currentZ += step;
    if (currentZ > maxZ) {
      currentZ = 0;
    }

    const beamRadius = waistMeter * Math.sqrt(1 + Math.pow(currentZ / rayleighLength, 2));

    expChart.setOption({
      series: [{
        markLine: {
          data: [
            { xAxis: rayleighLength, label: { formatter: 'zR', color: '#e67e22' } },
            { xAxis: currentZ, label: { formatter: 'z', color: '#e74c3c' }, lineStyle: { color: '#e74c3c' } }
          ]
        }
      }]
    });

    updateParamsDisplay({ ...params, z: currentZ });
  }, 80);
}

function playExperiment() {
  if (currentExperiment === 0) return;

  isPlaying = true;
  updateButtons();

  const exp = experiments[currentExperiment];

  if (currentStep < exp.steps.length - 1) {
    playInterval = setInterval(() => {
      if (currentStep < exp.steps.length - 1) {
        currentStep++;
        displayStep(currentStep);
      } else {
        pauseExperiment();
        markExperimentComplete();
      }
    }, 6000);
  }
}

function pauseExperiment() {
  isPlaying = false;
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
  updateButtons();
}

function resetExperiment() {
  pauseExperiment();
  currentStep = 0;

  if (currentExperiment > 0) {
    const exp = experiments[currentExperiment];
    document.getElementById('stepIndicator').textContent = `步骤 ${currentStep}/${exp.steps.length}`;
    displayStep(0);
  }

  updateButtons();
}

function nextStep() {
  if (currentExperiment === 0) return;

  const exp = experiments[currentExperiment];
  if (currentStep < exp.steps.length - 1) {
    currentStep++;
    displayStep(currentStep);
  }
}

function saveExperimentRecord() {
  const exp = experiments[currentExperiment];
  if (!exp) return;

  const params = exp.params;
  const wavelengthMeter = params.wavelength * 1e-9;
  const waistMeter = params.waist * 1e-3;
  const zR = Math.PI * waistMeter * waistMeter / wavelengthMeter;
  const theta = wavelengthMeter / (Math.PI * waistMeter);
  const beamRadius = waistMeter * Math.sqrt(1 + Math.pow(params.z / zR, 2));

  const record = {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    experimentId: currentExperiment,
    timestamp: Date.now(),
    params: {
      wavelength: params.wavelength,
      waist: params.waist,
      z: params.z
    },
    results: {
      zR: zR,
      theta: theta,
      beamRadius: beamRadius
    }
  };

  let records = JSON.parse(localStorage.getItem(DATA_CENTER_KEY) || '[]');
  records.push(record);
  localStorage.setItem(DATA_CENTER_KEY, JSON.stringify(records));
}

function markExperimentComplete() {
  completedExperiments[currentExperiment] = true;
  const statusEl = document.getElementById(`exp${currentExperiment}-status`);
  if (statusEl) {
    statusEl.classList.add('completed');
  }
  saveExperimentRecord();
}

function updateButtons() {
  const hasExperiment = currentExperiment > 0;
  const exp = experiments[currentExperiment];
  const hasMoreSteps = exp && currentStep < exp.steps.length - 1;

  document.getElementById('playBtn').disabled = !hasExperiment || !hasMoreSteps;
  document.getElementById('pauseBtn').disabled = !isPlaying;
  document.getElementById('resetBtn').disabled = !hasExperiment;
  document.getElementById('nextBtn').disabled = !hasExperiment || !hasMoreSteps;
}

function toggleFormulaPanel() {
  const panel = document.getElementById('formulaPanel');
  const toggle = document.getElementById('formulaToggle');

  panel.classList.toggle('hidden');
  toggle.classList.toggle('visible');
}

function goBack() {
  pauseExperiment();
  window.location.href = 'index.html';
}

function downloadExperimentGuide() {
  const content = generateExperimentGuideContent();
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '高斯光束教学实验指导书.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateExperimentGuideContent() {
  return `高斯光束教学实验指导书
========================

一、实验目的
-----------
1. 理解高斯光束的基本特性
2. 掌握瑞利长度、发散角等概念
3. 了解波长、束腰对光束特性的影响
4. 观察光束随传播距离的扩散变化

二、实验原理
-----------
1. 高斯光束基本公式：
   - 瑞利长度：zR = πw₀²/λ
   - 发散角：θ = λ/(πw₀)
   - 光束半径：w(z) = w₀√(1+(z/zR)²)

2. 物理意义：
   - 束腰 w₀：光束最细处的半径
   - 瑞利长度 zR：光束近似的直线传播距离
   - 发散角 θ：远场光束的发散程度

三、实验内容
-----------

实验1：波长对发散角的影响
.........................
目的：观察不同波长激光束的发散角变化规律

原理：发散角 θ 与波长 λ 成正比，与束腰 w₀ 成反比

实验步骤：
1. 固定束腰 w₀ = 0.5mm
2. 分别测量 λ = 400nm、632.8nm、1000nm 时的发散角
3. 记录数据并分析

实验数据：
| 波长 λ (nm) | 发散角 θ (mrad) |
|-------------|-----------------|
| 400         | 0.255           |
| 632.8       | 0.403           |
| 1000        | 0.637           |

结论：发散角与波长成正比

---

实验2：束腰对瑞利长度的影响
.........................
目的：观察不同束腰大小对瑞利长度的影响

原理：瑞利长度 zR 与束腰的平方成正比，与波长成反比

实验步骤：
1. 固定波长 λ = 632.8nm
2. 分别测量 w₀ = 0.2mm、0.5mm、1.0mm 时的瑞利长度
3. 记录数据并分析

实验数据：
| 束腰 w₀ (mm) | 瑞利长度 zR (m) |
|--------------|-----------------|
| 0.2          | 0.198          |
| 0.5          | 1.242          |
| 1.0          | 4.967          |

结论：瑞利长度与束腰平方成正比

---

实验3：传播距离对光束扩散的影响
.........................
目的：观察光束随传播距离的扩散变化

原理：光束半径随传播距离按 w(z) = w₀√(1+(z/zR)²) 变化

实验步骤：
1. 设置 λ = 632.8nm，w₀ = 0.5mm
2. 计算瑞利长度 zR ≈ 1.24m
3. 分别观察 z = 0、zR、2zR、5zR 位置的光束半径
4. 记录数据并分析

实验数据：
| 传播距离 z (m) | 光束半径 w(z) (mm) | 相对束腰倍数 |
|---------------|-------------------|-------------|
| 0             | 0.500             | 1.00        |
| 1.24 (zR)     | 0.707             | 1.41        |
| 2.48 (2zR)    | 1.118             | 2.24        |
| 6.20 (5zR)    | 2.549             | 5.10        |

结论：在瑞利长度内光束近似直线传播，超过后快速扩散

四、实验仪器
-----------
1. 计算机（运行教学实验软件）
2. 显示器（观察仿真结果）

五、注意事项
-----------
1. 实验前应理解高斯光束的基本公式
2. 注意观察不同参数变化时光束曲线的差异
3. 实验过程中可随时暂停、重新播放
4. 建议完成实验1后再进行实验2，以此类推

六、思考题
-----------
1. 如果要减小发散角，有哪些方法？
2. 为什么大束腰的光束具有更长的瑞利长度？
3. 光束在远场的扩散速度与哪些因素有关？

七、参考文献
-----------
1. 《激光原理》- 周炳琨等
2. 《光学》- 赵凯华等
3. Siegman A E. Lasers. University Science Books, 1986.

========================
文档生成时间：${new Date().toLocaleDateString('zh-CN')}
`;
}

document.addEventListener('DOMContentLoaded', init);