/* ===================================== */
/* 高斯光斑模拟模块 - 功能实现          */
/* ===================================== */

/* 使用立即执行函数创建独立的光斑模块作用域 */
(function () {
  /* 模块状态标记 */
  window.gaussianSpotModuleStatus = "loading";

  /* ===================================== */
  /* 第一部分：DOM 元素获取和初始化       */
  /* ===================================== */

  /* 获取光斑容器元素 */
  const spotContainer = document.getElementById("spotContainer");

  /* 获取参数输入框元素 */
  const wavelengthInput = document.getElementById("wavelength");
  const waistInput = document.getElementById("waist");
  const distanceInput = document.getElementById("distance");

  /* 当模块初始化时，如果输入框还未加载，则稍后重试 */
  let inputsReady = false;
  function ensureInputsReady() {
    if (!wavelengthInput || !waistInput || !distanceInput) {
      console.warn("⚠️ 参数输入框未找到，尝试重新获取...");
      return false;
    }
    inputsReady = true;
    return true;
  }

  /* Canvas 元素和上下文 */
  let spotCanvas = null;
  let spotCanvasContext = null;

  /* 动画帧 ID，用于取消动画 */
  let animationFrameId = null;

  /* 当前光斑参数 */
  let spotParameters = {
    wavelengthMeter: 632.8e-9,
    waistMeter: 0.5e-3,
    distanceMeter: 1.0,
    centerIntensity: 1.0
  };

  /* ===================================== */
  /* 第二部分：HTML 结构创建              */
  /* ===================================== */

  /* 初始化光斑容器的 HTML 结构 */
  function initializeSpotContainer() {
    if (!spotContainer) {
      console.error("光斑容器元素不存在");
      return false;
    }

    /* 创建容器内容 */
    spotContainer.innerHTML = `
      <h2>高斯光斑模拟 2D 可视化</h2>
      <div class="spot-display-wrapper active" id="spotWrapper">
        <canvas id="gaussianSpotCanvas"></canvas>
      </div>
      <div class="spot-parameters-panel">
        <div class="spot-param-row">
          <span class="spot-param-label">波长 λ</span>
          <span class="spot-param-value" id="spotParamWavelength">632.8 nm</span>
        </div>
        <div class="spot-param-row">
          <span class="spot-param-label">束腰 w₀</span>
          <span class="spot-param-value" id="spotParamWaist">0.5 mm</span>
        </div>
        <div class="spot-param-row">
          <span class="spot-param-label">传播距离 z</span>
          <span class="spot-param-value" id="spotParamDistance">1.0 m</span>
        </div>
        <div class="spot-param-row">
          <span class="spot-param-label">实时光强比</span>
          <span class="spot-param-value" id="spotParamIntensity">100%</span>
        </div>
      </div>
      <div class="spot-description">
        💡 <strong>高斯分布公式：</strong> I(r) = I₀ × exp(-2r²/w²)<br>
        中心最亮，边缘逐渐变暗。光斑大小随束腰变化实时更新。
      </div>
      <div class="spot-center-intensity">
        中心光强：<span id="spotCenterValue">I₀ = 1.0</span>
      </div>
      <div class="spot-info-box">
        🔍 <strong>实时交互：</strong> 修改左侧参数，观察光斑变化。中心白色最亮，青绿色逐渐变暗至透明。
      </div>
    `;

    /* 获取新创建的 Canvas 元素 */
    spotCanvas = document.getElementById("gaussianSpotCanvas");
    if (!spotCanvas) {
      console.error("Canvas 元素创建失败");
      return false;
    }

    /* 获取 Canvas 的 2D 绘图上下文 */
    spotCanvasContext = spotCanvas.getContext("2d");
    if (!spotCanvasContext) {
      console.error("Canvas 2D 上下文获取失败");
      return false;
    }

    return true;
  }

  /* ===================================== */
  /* 第三部分：单位转换函数                */
  /* ===================================== */

  /* 将纳米转换为米 */
  function nanometerToMeter(value) {
    return value * 1e-9;
  }

  /* 将毫米转换为米 */
  function millimeterToMeter(value) {
    return value * 1e-3;
  }

  /* 读取输入框的数值，如果为空则使用 placeholder */
  function getInputValue(inputElement) {
    return Number(inputElement.value || inputElement.placeholder);
  }

  /* ===================================== */
  /* 第四部分：参数读取和更新              */
  /* ===================================== */

  /* 从输入框读取参数并进行单位转换 */
  function readSpotParameters() {
    /* 重新获取元素以确保最新值 */
    const wavelengthElem = document.getElementById("wavelength") || wavelengthInput;
    const waistElem = document.getElementById("waist") || waistInput;
    const distanceElem = document.getElementById("distance") || distanceInput;

    if (!wavelengthElem || !waistElem || !distanceElem) {
      console.warn("⚠️ 参数输入框未找到");
      return null;
    }

    const wavelengthValue = getInputValue(wavelengthElem);
    const waistValue = getInputValue(waistElem);
    const distanceValue = getInputValue(distanceElem);

    /* 进行单位转换 */
    const wavelengthMeter = nanometerToMeter(wavelengthValue);
    const waistMeter = millimeterToMeter(waistValue);
    const distanceMeter = distanceValue;

    /* 计算距离 z 处的光束半径 */
    const rayleighLength = Math.PI * waistMeter * waistMeter / wavelengthMeter;
    const beamRadiusAtDistance = waistMeter * Math.sqrt(1 + (distanceMeter / rayleighLength) ** 2);

    return {
      wavelengthMeter,
      waistMeter,
      distanceMeter,
      beamRadiusAtDistance,
      rayleighLength,
      wavelengthDisplay: wavelengthValue.toFixed(1),
      waistDisplay: waistValue.toFixed(1),
      distanceDisplay: distanceValue.toFixed(1)
    };
  }

  /* 判断参数是否有效 */
  function isValidSpotParameters(params) {
    if (!params) {
      return false;
    }
    return params.wavelengthMeter > 0 && params.waistMeter > 0 && params.distanceMeter >= 0;
  }

  /* 更新参数显示面板 */
  function updateParametersDisplay() {
    const params = readSpotParameters();

    if (!isValidSpotParameters(params)) {
      return;
    }

    /* 更新参数显示元素 */
    const wavelengthDisplay = document.getElementById("spotParamWavelength");
    const waistDisplay = document.getElementById("spotParamWaist");
    const distanceDisplay = document.getElementById("spotParamDistance");
    const intensityDisplay = document.getElementById("spotParamIntensity");
    const centerDisplay = document.getElementById("spotCenterValue");

    if (wavelengthDisplay) {
      wavelengthDisplay.textContent = `${params.wavelengthDisplay} nm`;
    }
    if (waistDisplay) {
      waistDisplay.textContent = `${params.waistDisplay} mm`;
    }
    if (distanceDisplay) {
      distanceDisplay.textContent = `${params.distanceDisplay} m`;
    }

    /* 计算实时光强比（相对于束腰处的光强）*/
    const intensityRatio = (params.waistMeter / params.beamRadiusAtDistance) ** 2;
    const intensityPercent = (intensityRatio * 100).toFixed(1);
    if (intensityDisplay) {
      intensityDisplay.textContent = `${intensityPercent}%`;
    }

    /* 更新中心光强显示 */
    if (centerDisplay) {
      centerDisplay.textContent = `I₀ = 1.0`;
    }

    spotParameters = {
      ...params,
      centerIntensity: 1.0,
      intensityRatio
    };
  }

  /* ===================================== */
  /* 第五部分：Canvas 尺寸管理             */
  /* ===================================== */

  /* 调整 Canvas 尺寸适应容器和设备像素比 */
  function resizeSpotCanvas() {
    if (!spotCanvas) {
      return;
    }

    const wrapper = document.getElementById("spotWrapper");
    if (!wrapper) {
      return;
    }

    /* 获取容器的显示尺寸 */
    const displayWidth = wrapper.clientWidth;
    const displayHeight = wrapper.clientHeight;

    /* 设置 Canvas 尺寸与容器一致 */
    spotCanvas.width = displayWidth;
    spotCanvas.height = displayHeight;
    spotCanvas.style.width = `${displayWidth}px`;
    spotCanvas.style.height = `${displayHeight}px`;

    /* 重置绘图上下文变换 */
    spotCanvasContext.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ===================================== */
  /* 第六部分：核心绘图函数                */
  /* ===================================== */

  /* 计算指定半径处的高斯光强值 */
  /* 公式：I(r) = I0 * exp(-2r²/w²) */
  function calculateGaussianIntensity(radius, beamRadius, centerIntensity) {
    if (beamRadius <= 0) {
      return 0;
    }

    /* 计算标准化的半径（相对于束腰） */
    const normalizedRadius = radius / beamRadius;

    /* 使用高斯分布公式计算光强 */
    const intensity = centerIntensity * Math.exp(-2 * normalizedRadius * normalizedRadius);

    return Math.max(0, Math.min(1, intensity));
  }

  /* 绘制高斯光斑背景 */
  function drawSpotBackground(canvasWidth, canvasHeight) {
    /* 清除画布 */
    spotCanvasContext.clearRect(0, 0, spotCanvas.width, spotCanvas.height);
    
    /* 创建深色背景 */
    spotCanvasContext.fillStyle = "rgba(255, 255, 255, 0.98)";
    spotCanvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /* 绘制高斯光斑 - 使用像素级别精细控制 */
  function drawGaussianSpot(beamRadius) {
    if (!spotCanvasContext || !spotCanvas) {
      console.warn("⚠️ Canvas 上下文不可用");
      return;
    }

    /* 获取 Canvas 的显示尺寸（使用 clientWidth/clientHeight 而不是内部尺寸） */
    const wrapper = document.getElementById("spotWrapper");
    if (!wrapper) {
      console.warn("⚠️ 光斑容器未找到");
      return;
    }
    
    const canvasWidth = wrapper.clientWidth;
    const canvasHeight = wrapper.clientHeight;

    if (canvasWidth <= 0 || canvasHeight <= 0) {
      console.warn("⚠️ Canvas 尺寸无效", { canvasWidth, canvasHeight });
      return;
    }

    /* 光斑中心坐标 - 确保在屏幕正中心 */
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    /* 计算光斑大小：使用容器最小边的 70% 作为最大光斑半径 */
    const maxDrawRadius = Math.min(canvasWidth, canvasHeight) * 0.35;
    const actualBeamRadius = Math.min(beamRadius, maxDrawRadius);

    if (actualBeamRadius <= 0) {
      console.warn("⚠️ 实际光斑半径无效", { beamRadius, actualBeamRadius });
      return;
    }

    console.log(`🎯 光斑中心: (${centerX}, ${centerY}), 半径: ${actualBeamRadius}px`);

    /* 绘制背景 */
    drawSpotBackground(canvasWidth, canvasHeight);

    /* 使用径向渐变创建光斑 - 从中心到边缘平滑过渡 */
    const spotGradient = spotCanvasContext.createRadialGradient(
      centerX, centerY, 0,           /* 起始圆：中心点，半径 0 */
      centerX, centerY, actualBeamRadius * 3  /* 结束圆：扩展到 3 倍束腰 */
    );

    /* 渐变色阶设置 - 更平滑的光强变化 */
    spotGradient.addColorStop(0, "rgba(255, 255, 255, 1)");          /* 中心：纯白，最强光强 */
    spotGradient.addColorStop(0.15, "rgba(255, 255, 255, 0.95)");    /* 近中心：微暗 */
    spotGradient.addColorStop(0.3, "rgba(220, 255, 248, 0.85)");     /* 内圈：带青色调 */
    spotGradient.addColorStop(0.45, "rgba(150, 255, 242, 0.7)");     /* 中圈：明显青绿 */
    spotGradient.addColorStop(0.6, "rgba(100, 230, 220, 0.5)");      /* 外圈：中等强度 */
    spotGradient.addColorStop(0.75, "rgba(70, 200, 190, 0.3)");      /* 边缘：较淡 */
    spotGradient.addColorStop(0.88, "rgba(50, 180, 170, 0.15)");     /* 外围：很淡 */
    spotGradient.addColorStop(1, "rgba(50, 180, 170, 0)");           /* 最边缘：完全透明 */

    spotCanvasContext.fillStyle = spotGradient;
    spotCanvasContext.beginPath();
    spotCanvasContext.arc(centerX, centerY, actualBeamRadius * 3, 0, Math.PI * 2);
    spotCanvasContext.fill();

    /* 绘制光斑轮廓圈（高斯 1/e² 处，即实际束腰位置） */
    spotCanvasContext.strokeStyle = "rgba(80, 230, 220, 0.7)";
    spotCanvasContext.lineWidth = 2;
    spotCanvasContext.beginPath();
    spotCanvasContext.arc(centerX, centerY, actualBeamRadius, 0, Math.PI * 2);
    spotCanvasContext.stroke();

    /* 绘制中心十字标记 */
    const crossSize = 12;
    spotCanvasContext.strokeStyle = "rgba(255, 255, 255, 0.8)";
    spotCanvasContext.lineWidth = 1;
    spotCanvasContext.beginPath();
    spotCanvasContext.moveTo(centerX - crossSize, centerY);
    spotCanvasContext.lineTo(centerX + crossSize, centerY);
    spotCanvasContext.moveTo(centerX, centerY - crossSize);
    spotCanvasContext.lineTo(centerX, centerY + crossSize);
    spotCanvasContext.stroke();

    /* 绘制网格线帮助理解光斑大小 */
    spotCanvasContext.strokeStyle = "rgba(66, 215, 200, 0.15)";
    spotCanvasContext.lineWidth = 1;
    const gridSpacing = actualBeamRadius * 0.5;
    for (let i = 1; i < 3; i++) {
      spotCanvasContext.beginPath();
      spotCanvasContext.arc(centerX, centerY, gridSpacing * i, 0, Math.PI * 2);
      spotCanvasContext.stroke();
    }

    /* 添加光斑参数标注 */
    drawSpotAnnotations(centerX, centerY, actualBeamRadius);
  }

  /* 绘制光斑的参数标注 */
function drawSpotAnnotations(centerX, centerY, beamRadius) {
  spotCanvasContext.save();

  /* 设置文字样式 */
  spotCanvasContext.font = "12px 'Microsoft YaHei', Arial";
  spotCanvasContext.fillStyle = "rgba(66, 215, 200, 0.8)";
  spotCanvasContext.textAlign = "center";

  /* 在光斑右侧标注当前光束半径 */
  const annotationX = centerX + beamRadius + 20;
  const annotationY = centerY - 15;
  spotCanvasContext.fillText(`w(z) = ${(spotParameters.beamRadiusAtDistance * 1e3).toFixed(3)} mm`, annotationX, annotationY);
  
  /* 标注束腰大小 */
  const annotationY2 = centerY + 15;
  spotCanvasContext.fillText(`w₀ = ${(spotParameters.waistMeter * 1e3).toFixed(3)} mm`, annotationX, annotationY2);

  /* 在光斑下方标注光强公式 */
  spotCanvasContext.font = "11px 'Courier New', monospace";
  spotCanvasContext.fillStyle = "rgba(66, 215, 200, 0.6)";
  spotCanvasContext.fillText(`I(r) = I₀ × exp(-2r²/w²)`, centerX, centerY + beamRadius + 30);

  spotCanvasContext.restore();
}

  /* ===================================== */
  /* 第七部分：主要绘制函数                */
  /* ===================================== */

  /* 完整的光斑绘制逻辑 */
function renderGaussianSpot() {
  /* 更新参数显示 */
  updateParametersDisplay();

  const params = spotParameters;
  
  if (!params || !isValidSpotParameters(params)) {
    console.warn("⚠️ 参数无效，跳过绘制", params);
    return;
  }

  /* 使用距离 z 处的光束半径作为光斑显示的束腰 */
  const displayBeamRadius = params.beamRadiusAtDistance;

  /* 计算缩放比例：将物理尺寸（米）转换为屏幕像素 */
  /* 由于束腰通常是毫米级，需要放大显示 */
  const radiusScale = 200000; /* 1米 = 200000像素 */
  
  /* 将光束半径从米转换为像素 */
  const displayRadiusPixel = displayBeamRadius * radiusScale;
  
  console.log(`📐 光束半径: ${displayBeamRadius.toExponential(4)} m -> ${displayRadiusPixel.toFixed(1)} px`);

  /* 绘制高斯光斑 */
  drawGaussianSpot(displayRadiusPixel);
}

  /* 动画帧回调 - 持续渲染光斑 */
  function animateGaussianSpot() {
    renderGaussianSpot();
    animationFrameId = requestAnimationFrame(animateGaussianSpot);
  }

  /* ===================================== */
  /* 第八部分：事件绑定和交互              */
  /* ===================================== */

  /* 绑定参数输入框的事件监听 */
  function bindSpotInputEvents() {
    /* 重新获取输入框元素，确保绑定到正确的元素 */
    const wavelengthElem = document.getElementById("wavelength");
    const waistElem = document.getElementById("waist");
    const distanceElem = document.getElementById("distance");

    const inputElements = [wavelengthElem, waistElem, distanceElem].filter(el => el !== null);

    if (inputElements.length === 0) {
      console.warn("⚠️ 参数输入框未找到，事件绑定失败");
      return;
    }

    console.log(`✅ 已绑定 ${inputElements.length} 个输入框事件`);

    inputElements.forEach(function (inputElement) {
      /* 监听 input 事件 - 用户输入时实时更新 */
      inputElement.addEventListener("input", function () {
        console.log("📝 input 事件触发");
        renderGaussianSpot();
      });

      /* 监听 change 事件 - 输入框失焦时更新 */
      inputElement.addEventListener("change", function () {
        console.log("📝 change 事件触发");
        renderGaussianSpot();
      });
    });
  }

  /* 监听窗口尺寸变化事件 */
  function bindWindowResizeEvent() {
    window.addEventListener("resize", function () {
      resizeSpotCanvas();
      renderGaussianSpot();
    });
  }

  /* ===================================== */
  /* 第九部分：模块初始化                  */
  /* ===================================== */

  /* 初始化整个光斑模块 */
  function initializeGaussianSpotModule() {
    try {
      /* 第一步：创建 HTML 结构 */
      const htmlInitialized = initializeSpotContainer();
      if (!htmlInitialized) {
        window.gaussianSpotModuleStatus = "failed";
        console.error("❌ HTML 结构创建失败");
        return;
      }

      console.log("✅ HTML 结构创建成功");

      /* 第二步：调整 Canvas 尺寸 */
      resizeSpotCanvas();
      console.log("✅ Canvas 尺寸调整成功");

      /* 第三步：读取初始参数 */
      updateParametersDisplay();
      console.log("✅ 参数显示已更新");

      /* 第四步：绑定事件监听 */
      bindSpotInputEvents();
      bindWindowResizeEvent();
      console.log("✅ 事件监听已绑定");

      /* 第五步：启动动画循环 */
      window.gaussianSpotModuleStatus = "ready";
      console.log("✅ 启动动画循环");
      animateGaussianSpot();

      console.log("✅ 高斯光斑模块初始化成功");
    } catch (error) {
      window.gaussianSpotModuleStatus = "failed";
      console.error("❌ 高斯光斑模块初始化失败:", error);
    }
  }

  /* ===================================== */
  /* 第十部分：模块启动                    */
  /* ===================================== */

  /* 等待 DOM 完全加载后启动模块 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeGaussianSpotModule);
  } else {
    /* 如果 DOM 已加载，直接初始化 */
    initializeGaussianSpotModule();
  }

  /* 页面卸载时清理资源 */
  window.addEventListener("beforeunload", function () {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

})();
