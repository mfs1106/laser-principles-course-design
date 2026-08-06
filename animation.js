/* 使用立即执行函数创建独立动画模块，避免影响已有计算和图表代码 */
(function () {
  /* 记录动画模块加载状态，方便浏览器中检查模块是否执行 */
  window.beamAnimationModuleStatus = "loading";

  /* 获取中间光束显示区域，Canvas 会被添加到这个区域中 */
  const beamDisplayElement = document.querySelector(".beam-display");

  /* 获取波长输入框，输入单位为 nm */
  const wavelengthInput = document.getElementById("wavelength");

  /* 获取束腰输入框，输入单位为 mm */
  const waistInput = document.getElementById("waist");

  /* 获取传播距离输入框，输入单位为 m */
  const distanceInput = document.getElementById("distance");

  /* 创建 Canvas 元素，用于绘制二维光束传播动画 */
  const animationCanvas = document.createElement("canvas");

  /* 获取 Canvas 的二维绘图上下文 */
  const canvasContext = animationCanvas.getContext("2d");

  /* 保存当前动画参数，参数变化时会同步更新 */
  let animationParameters = null;

  /* 保存动画开始时间，用于计算光束从左向右传播的位置 */
  let animationStartTime = performance.now();

  /* 将 Canvas 加入页面中间显示区 */
  function mountAnimationCanvas() {
    if (!beamDisplayElement || !canvasContext) {
      return;
    }

    animationCanvas.id = "beamAnimationCanvas";
    animationCanvas.className = "beam-animation-canvas";
    beamDisplayElement.prepend(animationCanvas);
  }

  /* 将 nm 单位转换为 m 单位，供动画模块独立使用 */
  function convertNanometerToMeter(value) {
    return value * 1e-9;
  }

  /* 将 mm 单位转换为 m 单位，供动画模块独立使用 */
  function convertMillimeterToMeter(value) {
    return value * 1e-3;
  }

  /* 读取输入框数值，如果输入框为空则使用 placeholder 中的默认值 */
  function readInputNumber(inputElement) {
    return Number(inputElement.value || inputElement.placeholder);
  }

  /* 从页面读取动画需要的参数，并完成单位换算 */
  function readAnimationParameters() {
    return {
      wavelengthMeter: convertNanometerToMeter(readInputNumber(wavelengthInput)),
      waistMeter: convertMillimeterToMeter(readInputNumber(waistInput)),
      distanceMeter: readInputNumber(distanceInput)
    };
  }

  /* 判断动画参数是否合法，避免除零或无效数值 */
  function isAnimationParametersValid(parameters) {
    return parameters.wavelengthMeter > 0 && parameters.waistMeter > 0 && parameters.distanceMeter >= 0;
  }

  /* 计算瑞利长度，动画模块只使用自己的局部函数，不修改已有数学公式模块 */
  function calculateAnimationRayleighLength(parameters) {
    return Math.PI * parameters.waistMeter ** 2 / parameters.wavelengthMeter;
  }

  /* 计算指定传播距离处的光束半径 w(z) */
  function calculateAnimationBeamRadius(parameters, currentDistance) {
    const rayleighLength = calculateAnimationRayleighLength(parameters);

    return parameters.waistMeter * Math.sqrt(1 + (currentDistance / rayleighLength) ** 2);
  }

  /* 根据设备像素比调整 Canvas 尺寸，保证动画显示清晰 */
  function resizeAnimationCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    const displayWidth = beamDisplayElement.clientWidth;
    const displayHeight = beamDisplayElement.clientHeight;

    animationCanvas.width = displayWidth * pixelRatio;
    animationCanvas.height = displayHeight * pixelRatio;
    animationCanvas.style.width = `${displayWidth}px`;
    animationCanvas.style.height = `${displayHeight}px`;
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  /* 根据当前输入参数更新动画参数 */
  function updateAnimationParameters() {
    const nextParameters = readAnimationParameters();

    if (!isAnimationParametersValid(nextParameters)) {
      return;
    }

    animationParameters = nextParameters;
  }

  /* 计算物理光束半径到屏幕像素半径的映射比例 */
  function calculateRadiusScale(parameters, canvasHeight) {
    const maxDistance = parameters.distanceMeter > 0 ? parameters.distanceMeter : 1;
    const maxBeamRadius = calculateAnimationBeamRadius(parameters, maxDistance);
    const maxPixelRadius = canvasHeight * 0.26;

    return maxPixelRadius / maxBeamRadius;
  }

  /* 绘制深色背景，使光束亮度层次更加明显 */
  function drawAnimationBackground(canvasWidth, canvasHeight) {
    const backgroundGradient = canvasContext.createLinearGradient(0, 0, canvasWidth, canvasHeight);

    backgroundGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    backgroundGradient.addColorStop(0.55, "rgba(245, 246, 248, 0.92)");
    backgroundGradient.addColorStop(1, "rgba(255, 255, 255, 0.95)");

    canvasContext.fillStyle = backgroundGradient;
    canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /* 使用 I(r)=I0*exp(-2r²/w²) 绘制某一传播位置的光强分布 */
  function drawGaussianSlice(xPosition, centerY, beamRadiusPixel, intensityFactor, canvasHeight) {
    const drawLimit = beamRadiusPixel * 2.8;
    const topY = Math.max(0, centerY - drawLimit);
    const bottomY = Math.min(canvasHeight, centerY + drawLimit);

    for (let yPosition = topY; yPosition <= bottomY; yPosition += 2) {
      const radialDistance = yPosition - centerY;
      const gaussianIntensity = Math.exp(-2 * radialDistance ** 2 / beamRadiusPixel ** 2);
      const alpha = gaussianIntensity * intensityFactor;

      canvasContext.fillStyle = `rgba(66, 215, 200, ${alpha})`;
      canvasContext.fillRect(xPosition, yPosition, 4, 2);
    }
  }

  /* 绘制从左向右移动的高亮传播前沿 */
  function drawMovingWaveFront(timeSeconds, canvasWidth, canvasHeight) {
    const wavePosition = timeSeconds * 180 % (canvasWidth + 120) - 60;
    const centerY = canvasHeight * 0.5;
    const frontGradient = canvasContext.createRadialGradient(wavePosition, centerY, 0, wavePosition, centerY, 90);

    frontGradient.addColorStop(0, "rgba(210, 255, 250, 0.22)");
    frontGradient.addColorStop(0.45, "rgba(66, 215, 200, 0.12)");
    frontGradient.addColorStop(1, "rgba(66, 215, 200, 0)");

    canvasContext.fillStyle = frontGradient;
    canvasContext.beginPath();
    canvasContext.ellipse(wavePosition, centerY, 120, canvasHeight * 0.22, 0, 0, Math.PI * 2);
    canvasContext.fill();
  }

  /* 绘制完整二维高斯光束，让中心更亮、边缘逐渐变暗、半径逐渐扩散 */
  function drawGaussianBeamFrame(timeSeconds) {
    const canvasWidth = beamDisplayElement.clientWidth;
    const canvasHeight = beamDisplayElement.clientHeight;
    const centerY = canvasHeight * 0.5;
    const leftPadding = canvasWidth * 0.08;
    const rightPadding = canvasWidth * 0.08;
    const drawableWidth = canvasWidth - leftPadding - rightPadding;
    const maxDistance = animationParameters.distanceMeter > 0 ? animationParameters.distanceMeter : 1;
    const radiusScale = calculateRadiusScale(animationParameters, canvasHeight);

    drawAnimationBackground(canvasWidth, canvasHeight);

    for (let xIndex = 0; xIndex <= drawableWidth; xIndex += 4) {
      const currentX = leftPadding + xIndex;
      const distanceRatio = xIndex / drawableWidth;
      const currentDistance = maxDistance * distanceRatio;
      const beamRadiusMeter = calculateAnimationBeamRadius(animationParameters, currentDistance);
      const beamRadiusPixel = Math.max(8, beamRadiusMeter * radiusScale);
      const wavePosition = (timeSeconds * 180 % (drawableWidth + 120)) - 60;
      const movingHighlight = Math.exp(-Math.pow((xIndex - wavePosition) / 95, 2));
      const baseIntensity = 0.16 + 0.42 * movingHighlight;

      drawGaussianSlice(currentX, centerY, beamRadiusPixel, baseIntensity, canvasHeight);
    }

    drawMovingWaveFront(timeSeconds, canvasWidth, canvasHeight);
  }

  /* 每一帧刷新动画，实现实时运动效果 */
  function animateGaussianBeam() {
    const currentTime = performance.now();
    const timeSeconds = (currentTime - animationStartTime) / 1000;

    if (animationParameters) {
      drawGaussianBeamFrame(timeSeconds);
    }

    requestAnimationFrame(animateGaussianBeam);
  }

  /* 给输入框绑定事件，让参数变化后动画立即使用新参数 */
  function bindAnimationInputEvents() {
    const inputElements = [wavelengthInput, waistInput, distanceInput];

    inputElements.forEach(function (inputElement) {
      inputElement.addEventListener("input", updateAnimationParameters);
    });
  }

  /* 初始化动画模块，完成 Canvas 创建、尺寸设置、参数读取和动画启动 */
  function initGaussianBeamAnimation() {
    mountAnimationCanvas();
    resizeAnimationCanvas();
    
    // 延迟初始化参数，确保 DOM 已完全加载
    setTimeout(function () {
      updateAnimationParameters();
      if (animationParameters) {
        bindAnimationInputEvents();
        window.beamAnimationModuleStatus = "ready";
        requestAnimationFrame(animateGaussianBeam);
      } else {
        window.beamAnimationModuleStatus = "invalid_parameters";
      }
    }, 100);
  }

  /* 窗口尺寸变化时同步调整 Canvas 尺寸 */
  window.addEventListener("resize", resizeAnimationCanvas);

  /* 启动第四阶段 Canvas 二维光束传播动画 */
  document.addEventListener("DOMContentLoaded", initGaussianBeamAnimation);
})();
