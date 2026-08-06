// 瑞利长度可视化实验模块

console.log("=== 瑞利长度可视化模块加载 ===");

const wavelengthInput = document.getElementById("wavelength");
const waistInput = document.getElementById("waist");
const distanceInput = document.getElementById("distance");
const calculateButton = document.querySelector(".primary-button");
const resultValues = document.querySelectorAll(".result-item strong");
const beamChartElement = document.getElementById("beamChart");

let beamChart = null;
calculateButton.textContent = "开始计算";

function nanometerToMeter(value) {
  return value * 1e-9;
}

function millimeterToMeter(value) {
  return value * 1e-3;
}

function getInputNumber(inputElement) {
  return Number(inputElement.value || inputElement.placeholder);
}

function formatResult(value) {
  return value.toFixed(6);
}

function getParameters() {
  return {
    wavelengthMeter: nanometerToMeter(getInputNumber(wavelengthInput)),
    waistMeter: millimeterToMeter(getInputNumber(waistInput)),
    distanceMeter: getInputNumber(distanceInput)
  };
}

function calculateGaussianBeam(parameters) {
  const rayleighLength = Math.PI * parameters.waistMeter ** 2 / parameters.wavelengthMeter;
  const beamRadius = parameters.waistMeter * Math.sqrt(1 + (parameters.distanceMeter / rayleighLength) ** 2);
  const divergenceAngle = parameters.wavelengthMeter / (Math.PI * parameters.waistMeter);
  return { rayleighLength, beamRadius, divergenceAngle };
}

function showResults(results) {
  resultValues[0].textContent = `${formatResult(results.rayleighLength)} m`;
  resultValues[1].textContent = `${formatResult(results.beamRadius)} m`;
  resultValues[2].textContent = `${formatResult(results.divergenceAngle)} rad`;
}

function isValidParameters(parameters) {
  return parameters.wavelengthMeter > 0 && parameters.waistMeter > 0 && parameters.distanceMeter >= 0;
}

function initBeamChart() {
  if (typeof echarts === "undefined" || !beamChartElement) {
    console.warn("ECharts未加载或图表容器不存在");
    return false;
  }
  try {
    beamChart = echarts.init(beamChartElement);
    console.log("ECharts图表初始化成功");
    return true;
  } catch (error) {
    console.error("图表初始化失败:", error);
    return false;
  }
}

function buildBeamChartData(parameters) {
  const pointCount = 100;
  const maxDistance = parameters.distanceMeter > 0 ? parameters.distanceMeter : 1;
  const chartData = [];
  
  for (let i = 0; i <= pointCount; i++) {
    const z = maxDistance * i / pointCount;
    const r = calculateGaussianBeam({...parameters, distanceMeter: z});
    chartData.push([z, r.beamRadius]);
  }
  
  return chartData;
}

function updateBeamChart() {
  console.log("=== 更新光束传播图表 ===");
  
  const params = getParameters();
  console.log("参数:", params);
  
  if (!beamChart) {
    console.warn("图表未初始化");
    return;
  }
  
  if (!isValidParameters(params)) {
    console.warn("参数无效");
    return;
  }
  
  const rayleighLength = Math.PI * params.waistMeter ** 2 / params.wavelengthMeter;
  const maxDistance = params.distanceMeter > 0 ? params.distanceMeter : 1;
  const chartData = buildBeamChartData(params);
  
  console.log("瑞利长度:", rayleighLength);
  console.log("最大距离:", maxDistance);
  
  // 计算分界点索引
  const rayleighIdx = Math.floor(rayleighLength / maxDistance * 100);
  console.log("瑞利区分界索引:", rayleighIdx);
  
  // 瑞利区数据（0到zR）
  const rayleighData = [];
  for (let i = 0; i <= rayleighIdx && i < chartData.length; i++) {
    rayleighData.push(chartData[i]);
  }
  
  // 发散区数据（zR到max）
  const divergenceData = [];
  for (let i = rayleighIdx; i < chartData.length; i++) {
    divergenceData.push(chartData[i]);
  }

  const option = {
    backgroundColor: "transparent",
    textStyle: { color: "#555" },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#dde1e6",
      textStyle: { color: "#2c3e50" },
      formatter: function(items) {
        if (!items || !items[0] || !items[0].data) return "";
        const p = items[0].data;
        return `z: ${formatResult(p[0])} m<br>w(z): ${formatResult(p[1])} m`;
      }
    },
    grid: { top: 60, right: 40, bottom: 80, left: 80 },
    xAxis: {
      type: "value",
      name: "传播距离 z / m",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: { color: "#3a9e96", fontSize: 13 },
      axisLine: { lineStyle: { color: "#d0d5dd", width: 2 } },
      axisTick: { show: true, lineStyle: { color: "#d0d5dd" } },
      axisLabel: { color: "#666", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(0, 0, 0, 0.06)" } }
    },
    yAxis: {
      type: "value",
      name: "光束半径 w(z) / m",
      nameTextStyle: { color: "#3a9e96", fontSize: 13 },
      axisLine: { lineStyle: { color: "#d0d5dd", width: 2 } },
      axisTick: { show: true, lineStyle: { color: "#d0d5dd" } },
      axisLabel: { color: "#666", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(0, 0, 0, 0.06)" } }
    },
    series: [
      {
        name: "瑞利区 (z≤zR)",
        type: "line",
        smooth: false,
        showSymbol: false,
        data: rayleighData,
        lineStyle: { width: 0 },
        areaStyle: { color: "rgba(68, 170, 255, 0.2)" }
      },
      {
        name: "发散区 (z>zR)",
        type: "line",
        smooth: false,
        showSymbol: false,
        data: divergenceData,
        lineStyle: { width: 0 },
        areaStyle: { color: "rgba(255, 100, 68, 0.2)" }
      },
      {
        name: "光束半径",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: chartData,
        lineStyle: { width: 3, color: "#42d7c8" },
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          lineStyle: {
            color: ["#e67e22", "#3a9e96"],
            type: ["dashed", "dashed"],
            width: [2, 2]
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: "bold"
          },
          data: [
            { xAxis: 0, label: { formatter: "z=0 (束腰)", color: "#e67e22" } },
            { xAxis: rayleighLength, label: { formatter: "z=zR (瑞利长度)", color: "#3a9e96" } }
          ]
        }
      },
      {
        name: "发散区标注",
        type: "line",
        smooth: false,
        showSymbol: false,
        data: [[Math.min(rayleighLength * 1.5, maxDistance * 0.9), chartData[0][1] * 0.1]],
        lineStyle: { width: 0 },
        label: {
          show: true,
          position: 'top',
          formatter: 'z>zR (发散区)',
          color: '#e67e22',
          fontSize: 12,
          fontWeight: 'bold'
        }
      }
    ],
    legend: {
      show: true,
      bottom: 35,
      left: "center",
      data: ["光束半径", "瑞利区 (z≤zR)", "发散区 (z>zR)"],
      textStyle: { color: "#555", fontSize: 11 },
      itemWidth: 14,
      itemHeight: 14
    }
  };
  
  beamChart.setOption(option, true);
  console.log("图表更新完成");
}

function bindChartAutoUpdate() {
  [wavelengthInput, waistInput, distanceInput].forEach(input => {
    input.addEventListener("input", function() {
      console.log("参数变化，触发图表更新");
      updateBeamChart();
    });
  });
}

window.addEventListener("resize", () => {
  if (beamChart) {
    beamChart.resize();
    console.log("窗口大小变化，图表已调整");
  }
});

calculateButton.addEventListener("click", () => {
  console.log("=== 开始计算按钮点击 ===");
  const params = getParameters();
  const results = calculateGaussianBeam(params);
  showResults(results);
  updateBeamChart();
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("=== 页面加载完成 ===");
  if (initBeamChart()) {
    bindChartAutoUpdate();
    updateBeamChart();
  }
});
