/**
 * 高斯光束动态传播实验
 * propagation.js
 *
 * 物理公式：
 * - 瑞利长度: zR = πw₀²/λ
 * - 发散角: θ = λ/(πw₀)
 * - 光束半径: w(z) = w₀√(1+(z/zR)²)
 * - 光强分布: I(r) = I₀exp(-2r²/w²)
 */

// ==================== 全局变量 ====================
let wavelength = 632.8;      // 波长 (nm)
let waist = 0.5;           // 束腰 (mm)
let currentZ = 0;          // 当前传播距离 (m)
let maxZ = 5;               // 最大传播距离 (m)
let isAnimating = false;    // 动画是否运行
let animationId = null;     // 动画帧ID
let lastTimestamp = 0;      // 上次时间戳
let animationSpeed = 0.5;   // 动画速度 (m/s)

// Canvas 元素
let propagationCanvas, propagationCtx;
let crossSectionCanvas, crossSectionCtx;
let intensityCanvas, intensityCtx;

// 计算结果
let rayleighLength = 0;     // 瑞利长度 (m)
let divergenceAngle = 0;    // 发散角 (rad)
let beamRadius = 0;        // 当前光束半径 (m)

// ==================== 初始化函数 ====================
function init() {
  // 获取 Canvas 元素
  propagationCanvas = document.getElementById('propagationCanvas');
  propagationCtx = propagationCanvas.getContext('2d');

  crossSectionCanvas = document.getElementById('crossSectionCanvas');
  crossSectionCtx = crossSectionCanvas.getContext('2d');

  intensityCanvas = document.getElementById('intensityCanvas');
  intensityCtx = intensityCanvas.getContext('2d');

  // 绑定事件
  bindEvents();

  // 初始化计算
  updateCalculations();

  // 绘制初始画面
  resizeCanvas();
  drawPropagation();
  drawCrossSection();
  drawIntensity();

  // 监听窗口大小变化
  window.addEventListener('resize', resizeCanvas);
}

/**
 * 绑定输入框事件
 */
function bindEvents() {
  // 波长输入
  document.getElementById('wavelength').addEventListener('input', function() {
    wavelength = parseFloat(this.value) || 632.8;
    updateCalculations();
    drawPropagation();
    drawCrossSection();
    drawIntensity();
  });

  // 束腰输入
  document.getElementById('waist').addEventListener('input', function() {
    waist = parseFloat(this.value) || 0.5;
    updateCalculations();
    drawPropagation();
    drawCrossSection();
    drawIntensity();
  });

  // 传播距离输入
  document.getElementById('distance').addEventListener('input', function() {
    currentZ = parseFloat(this.value) || 0;
    document.getElementById('distanceSlider').value = currentZ;
    updateCurrentBeamRadius();
    drawPropagation();
    drawCrossSection();
    drawIntensity();
  });

  // 传播距离滑块
  document.getElementById('distanceSlider').addEventListener('input', function() {
    currentZ = parseFloat(this.value);
    document.getElementById('distance').value = currentZ.toFixed(2);
    updateCurrentBeamRadius();
    drawPropagation();
    drawCrossSection();
    drawIntensity();
  });
}

/**
 * 调整 Canvas 尺寸
 */
function resizeCanvas() {
  const container = propagationCanvas.parentElement;
  propagationCanvas.width = container.clientWidth;
  propagationCanvas.height = container.clientHeight;
  drawPropagation();
}

/**
 * 更新物理计算结果
 */
function updateCalculations() {
  // 单位转换
  const lambdaMeter = wavelength * 1e-9;  // nm -> m
  const waistMeter = waist * 1e-3;       // mm -> m

  // 计算瑞利长度: zR = πw₀²/λ
  rayleighLength = Math.PI * waistMeter * waistMeter / lambdaMeter;

  // 计算发散角: θ = λ/(πw₀)
  divergenceAngle = lambdaMeter / (Math.PI * waistMeter);

  // 更新当前光束半径
  updateCurrentBeamRadius();

  // 更新显示
  updateDataDisplay();
}

/**
 * 更新当前光束半径
 */
function updateCurrentBeamRadius() {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;

  // 计算 w(z) = w₀√(1+(z/zR)²)
  beamRadius = waistMeter * Math.sqrt(1 + Math.pow(currentZ / zR, 2));
}

/**
 * 更新数据显示区
 */
function updateDataDisplay() {
  document.getElementById('zRValue').textContent = rayleighLength.toFixed(4) + ' m';
  document.getElementById('thetaValue').textContent = (divergenceAngle * 1000).toFixed(4) + ' mrad';
  document.getElementById('beamRadiusValue').textContent = (beamRadius * 1000).toFixed(4) + ' mm';
  document.getElementById('currentZValue').textContent = currentZ.toFixed(4) + ' m';

  // 峰值光强归一化为1
  document.getElementById('peakIntensityValue').textContent = '1.00 (归一化)';

  // 半高宽 FWHM ≈ 1.177w
  const fwhm = beamRadius * 1.177;
  document.getElementById('fwhmValue').textContent = (fwhm * 1000).toFixed(4) + ' mm';
}

/**
 * 重置动画
 */
function resetAnimation() {
  pauseAnimation();
  currentZ = 0;
  document.getElementById('distance').value = '0';
  document.getElementById('distanceSlider').value = '0';
  updateCurrentBeamRadius();
  drawPropagation();
  drawCrossSection();
  drawIntensity();

  // 重置按钮状态
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
}

/**
 * 开始动画
 */
function startAnimation() {
  if (isAnimating) return;

  isAnimating = true;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;

  lastTimestamp = performance.now();
  animationId = requestAnimationFrame(animate);
}

/**
 * 暂停动画
 */
function pauseAnimation() {
  isAnimating = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * 动画循环
 */
function animate(timestamp) {
  if (!isAnimating) return;

  // 计算时间间隔
  const deltaTime = (timestamp - lastTimestamp) / 1000; // 转换为秒
  lastTimestamp = timestamp;

  // 更新传播距离
  currentZ += animationSpeed * deltaTime;

  // 边界检查
  if (currentZ >= maxZ) {
    currentZ = maxZ;
    pauseAnimation();
  }

  // 更新输入框
  document.getElementById('distance').value = currentZ.toFixed(2);
  document.getElementById('distanceSlider').value = currentZ;

  // 更新计算和绘制
  updateCurrentBeamRadius();
  updateDataDisplay();
  drawPropagation();
  drawCrossSection();
  drawIntensity();

  // 继续动画
  animationId = requestAnimationFrame(animate);
}

// ==================== 绘制函数 ====================

/**
 * 绘制光束传播图
 */
function drawPropagation() {
  const ctx = propagationCtx;
  const width = propagationCanvas.width;
  const height = propagationCanvas.height;

  // 清空画布
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 设置边距和绘图区域
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const centerY = height / 2;

  // 绘制网格
  drawGrid(ctx, margin, plotWidth, plotHeight, centerY);

  // 绘制高斯光束轮廓
  drawBeamContour(ctx, margin, plotWidth, plotHeight, centerY);

  // 绘制坐标轴
  drawAxes(ctx, margin, plotWidth, plotHeight);

  // 绘制标记线和标签
  drawMarkers(ctx, margin, plotWidth, plotHeight, centerY);

  // 绘制当前观察位置指示器
  drawCurrentPosition(ctx, margin, plotWidth, plotHeight, centerY);
}

/**
 * 绘制网格
 */
function drawGrid(ctx, margin, plotWidth, plotHeight, centerY) {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;

  // 水平中心线
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.moveTo(margin.left, centerY);
  ctx.lineTo(margin.left + plotWidth, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 垂直网格线
  const numVerticalLines = 10;
  for (let i = 0; i <= numVerticalLines; i++) {
    const x = margin.left + (plotWidth / numVerticalLines) * i;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotHeight);
    ctx.stroke();
  }

  // 水平网格线
  const numHorizontalLines = 6;
  for (let i = 0; i <= numHorizontalLines; i++) {
    const y = margin.top + (plotHeight / numHorizontalLines) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();
  }
}

/**
 * 绘制高斯光束轮廓
 */
function drawBeamContour(ctx, margin, plotWidth, plotHeight, centerY) {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
  const totalZ = maxZ;

  // 计算 Y 轴缩放因子
  const maxW = waistMeter * 3; // 最大光束半径
  const yScale = (plotHeight / 2 - 20) / maxW;

  // 绘制光束填充区域
  ctx.beginPath();
  ctx.moveTo(margin.left, centerY);

  for (let i = 0; i <= 200; i++) {
    const z = (i / 200) * totalZ;
    const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
    const x = margin.left + (z / totalZ) * plotWidth;
    const y = centerY - w * yScale;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  for (let i = 200; i >= 0; i--) {
    const z = (i / 200) * totalZ;
    const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
    const x = margin.left + (z / totalZ) * plotWidth;
    const y = centerY + w * yScale;
    ctx.lineTo(x, y);
  }

  ctx.closePath();

  // 渐变填充 - 修复超出范围问题
  const gradient = ctx.createLinearGradient(margin.left, 0, margin.left + plotWidth, 0);
  const ratio = Math.min(1, Math.max(0, zR / totalZ));
  
  if (ratio >= 1) {
    // 瑞利长度超过显示范围，全部显示蓝色
    gradient.addColorStop(0, 'rgba(66, 215, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(66, 215, 200, 0.2)');
  } else if (ratio <= 0) {
    // 瑞利长度小于0，全部显示红色
    gradient.addColorStop(0, 'rgba(255, 107, 107, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)');
  } else {
    gradient.addColorStop(0, 'rgba(66, 215, 200, 0.3)');
    gradient.addColorStop(ratio, 'rgba(66, 215, 200, 0.2)');
    gradient.addColorStop(ratio, 'rgba(255, 107, 107, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)');
  }

  ctx.fillStyle = gradient;
  ctx.fill();

  // 绘制光束中心线
  ctx.beginPath();
  ctx.strokeStyle = '#42d7c8';
  ctx.lineWidth = 2;
  ctx.moveTo(margin.left, centerY);
  ctx.lineTo(margin.left + plotWidth, centerY);
  ctx.stroke();

  // 绘制光束轮廓线
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(66, 215, 200, 0.8)';
  ctx.lineWidth = 2;

  for (let i = 0; i <= 200; i++) {
    const z = (i / 200) * totalZ;
    const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
    const x = margin.left + (z / totalZ) * plotWidth;
    const y = centerY - w * yScale;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
  for (let i = 0; i <= 200; i++) {
    const z = (i / 200) * totalZ;
    const w = waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
    const x = margin.left + (z / totalZ) * plotWidth;
    const y = centerY + w * yScale;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/**
 * 绘制坐标轴
 */
function drawAxes(ctx, margin, plotWidth, plotHeight) {
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#666';
  ctx.font = '11px Microsoft YaHei';

  // X 轴
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  // X 轴标签
  ctx.fillText('传播距离 z (m)', margin.left + plotWidth / 2 - 40, margin.top + plotHeight + 25);

  // X 轴刻度
  const zStep = maxZ / 5;
  for (let i = 0; i <= 5; i++) {
    const x = margin.left + (plotWidth / 5) * i;
    const z = (zStep * i).toFixed(1);
    ctx.fillText(z, x - 10, margin.top + plotHeight + 15);
  }

  // Y 轴
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.stroke();

  // Y 轴标签
  ctx.save();
  ctx.translate(15, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('光束半径 w(z) (mm)', -30, 0);
  ctx.restore();

  // Y 轴刻度
  const waistMeter = waist * 1e-3;
  const maxW = waistMeter * 3;
  const yScale = (plotHeight / 2 - 20) / maxW;
  const wStep = maxW / 3;
  for (let i = 0; i <= 3; i++) {
    const y = margin.top + plotHeight / 2 - (wStep * i) * yScale;
    const w = (wStep * i * 1000).toFixed(1);
    ctx.fillText(w, margin.left - 30, y + 4);
  }
}

/**
 * 绘制标记线和标签
 */
function drawMarkers(ctx, margin, plotWidth, plotHeight, centerY) {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
  const totalZ = maxZ;

  ctx.font = '12px Microsoft YaHei';

  // z = 0 标记线（束腰位置）
  const z0X = margin.left;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(z0X, margin.top);
  ctx.lineTo(z0X, margin.top + plotHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#e67e22';
  ctx.fillText('z = 0', z0X - 20, margin.top - 10);
  ctx.fillText('(束腰)', z0X - 25, margin.top + plotHeight + 35);

  // z = zR 标记线（瑞利长度位置）
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
    ctx.fillText('z = zR', zRX - 15, margin.top - 10);
    ctx.fillText(`(${zR.toFixed(2)}m)`, zRX - 30, margin.top + plotHeight + 35);

    // 瑞利区标注
    ctx.fillStyle = 'rgba(66, 215, 200, 0.3)';
    ctx.fillRect(z0X + 5, margin.top + 5, zRX - z0X - 10, 20);
    ctx.fillStyle = '#3a9e96';
    ctx.font = '10px Microsoft YaHei';
    ctx.fillText('瑞利区', z0X + (zRX - z0X) / 2 - 20, margin.top + 18);
  }

  // 发散区标注
  ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
  const zR_X = (zR <= totalZ && zR > 0) ? margin.left + (zR / totalZ) * plotWidth : margin.left + 5;
  ctx.fillRect(zR_X + 5, margin.top + 5, margin.left + plotWidth - zR_X - 10, 20);
  ctx.fillStyle = '#e74c3c';
  ctx.font = '10px Microsoft YaHei';
  ctx.fillText('发散区', zR_X + (margin.left + plotWidth - zR_X) / 2 - 20, margin.top + 18);

  ctx.font = '12px Microsoft YaHei';
}

/**
 * 绘制当前观察位置指示器
 */
function drawCurrentPosition(ctx, margin, plotWidth, plotHeight, centerY) {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;

  const x = margin.left + (currentZ / maxZ) * plotWidth;
  const w = waistMeter * Math.sqrt(1 + Math.pow(currentZ / zR, 2));
  const maxW = waistMeter * 3;
  const yScale = (plotHeight / 2 - 20) / maxW;

  // 垂直指示线
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, margin.top);
  ctx.lineTo(x, margin.top + plotHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  // 光束半径指示线
  const topY = centerY - w * yScale;
  const bottomY = centerY + w * yScale;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 10, topY);
  ctx.lineTo(x + 10, topY);
  ctx.moveTo(x - 10, bottomY);
  ctx.lineTo(x + 10, bottomY);
  ctx.stroke();

  // 当前位置标签
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Microsoft YaHei';
  ctx.fillText(`z = ${currentZ.toFixed(2)}m`, x - 30, margin.top + plotHeight + 35);

  // w(z) 标签
  ctx.fillText(`w = ${(w * 1000).toFixed(2)}mm`, x + 10, centerY - 10);
}

/**
 * 绘制横截面光斑
 */
function drawCrossSection() {
  const ctx = crossSectionCtx;
  const canvas = crossSectionCanvas;
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 5;

  // 清空画布
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
  const w = waistMeter * Math.sqrt(1 + Math.pow(currentZ / zR, 2));

  // 计算像素缩放（使光斑大小合适）
  const pixelScale = radius / (w * 3);

  // 绘制高斯光斑
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const r = Math.sqrt(dx * dx + dy * dy) / pixelScale;

      // 高斯光强分布: I = I₀exp(-2r²/w²)
      const intensity = Math.exp(-2 * r * r / (w * w));
      const i = (y * width + x) * 4;

      // 根据光强设置颜色（科技蓝）
      const r_ = Math.floor(66 + (255 - 66) * (1 - intensity) * 0.3);
      const g = Math.floor(215 - 100 * (1 - intensity));
      const b = Math.floor(200 + 55 * (1 - intensity));

      data[i] = r_;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // 绘制中心十字线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.stroke();

  // 绘制半径参考圆
  ctx.strokeStyle = 'rgba(66, 215, 200, 0.5)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, w * pixelScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * 绘制光强分布曲线
 */
function drawIntensity() {
  const ctx = intensityCtx;
  const canvas = intensityCanvas;
  const width = canvas.width;
  const height = canvas.height;

  // 清空画布
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  const zR = Math.PI * waistMeter * waistMeter / lambdaMeter;
  const w = waistMeter * Math.sqrt(1 + Math.pow(currentZ / zR, 2));

  // 设置绘图区域
  const margin = { top: 20, right: 30, bottom: 30, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // 绘制网格
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = margin.top + (plotHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();
  }

  // 计算 X 轴范围（-2w 到 +2w）
  const maxR = w * 2;
  const xScale = plotWidth / (2 * maxR);

  // 绘制坐标轴
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.stroke();

  // X 轴标签
  ctx.fillStyle = '#555';
  ctx.font = '10px Microsoft YaHei';
  ctx.fillText('r (mm)', margin.left + plotWidth / 2 - 15, height - 5);

  // Y 轴标签
  ctx.save();
  ctx.translate(12, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('归一化强度 I/I₀', -35, 0);
  ctx.restore();

  // X 轴刻度
  ctx.fillText((-maxR * 1000).toFixed(1), margin.left - 5, margin.top + plotHeight + 15);
  ctx.fillText('0', margin.left + plotWidth / 2 - 3, margin.top + plotHeight + 15);
  ctx.fillText((maxR * 1000).toFixed(1), margin.left + plotWidth - 5, margin.top + plotHeight + 15);

  // 绘制高斯曲线
  ctx.beginPath();
  ctx.strokeStyle = '#42d7c8';
  ctx.lineWidth = 2;

  for (let i = 0; i <= 200; i++) {
    const r = (-maxR + (2 * maxR / 200) * i);
    const intensity = Math.exp(-2 * r * r / (w * w));
    const x = margin.left + (r + maxR) * xScale;
    const y = margin.top + plotHeight * (1 - intensity);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // 填充曲线下方区域
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.closePath();
  ctx.fillStyle = 'rgba(66, 215, 200, 0.25)';
  ctx.fill();

  // 绘制 FWHM 标注
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

  // FWHM 标签
  ctx.fillStyle = '#e67e22';
  ctx.font = '10px Microsoft YaHei';
  ctx.fillText('FWHM', (fwhmX1 + fwhmX2) / 2 - 18, halfY - 5);
}

/**
 * 返回首页
 */
function goBack() {
  window.location.href = 'index.html';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);