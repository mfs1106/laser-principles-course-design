/**
 * 三维高斯光束可视化实验
 * 使用 Three.js 实现真正的高斯光束实体
 */

let scene, camera, renderer, controls;
let beamMesh, glowMesh, axisLines;
let crossSections = [];
let zMarkers = [];

// 发光效果参数
let glowEnabled = true;
let glowStrength = 1.5;
let glowRadius = 0.8;

// 粒子系统参数
let particles;
let particlePositions;
let particleVelocities;
let particleEnabled = true;
let particleSpeed = 1.0;
const particleCount = 800;

// 能量云参数
let energyCloud;
let energyCloudEnabled = true;
const energyCloudCount = 3000;

// TEM00模式参数
let temModeEnabled = false;
let temObserveZ = 0;
let temScene, temCamera, temRenderer;
let temMesh;
let temLight, temAmbient;

let wavelength = 632.8;    // nm
let waist = 0.5;           // mm
let maxDistance = 3;       // m
let visualScale = 500;     // 视觉缩放系数

const sceneScale = 10;     // 场景缩放基准

function init() {
  initScene();
  initControls();
  initEventListeners();
  createAxis();
  updateAll();
  animate();
}

function initScene() {
  const container = document.getElementById('scene-container');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f6f8);
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
  camera.position.set(8, 6, 10);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  scene.add(directionalLight);
  
  const directionalLight2 = new THREE.DirectionalLight(0x42d7c8, 0.4);
  directionalLight2.position.set(-10, -5, -10);
  scene.add(directionalLight2);
  
  const gridHelper = new THREE.GridHelper(sceneScale * 2, 40, 0x42d7c8, 0xd0d5dd);
  gridHelper.position.y = -0.001;
  scene.add(gridHelper);
}

function initControls() {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 30;
}

function initEventListeners() {
  window.addEventListener('resize', onWindowResize);
  
  document.getElementById('wavelength').addEventListener('input', onParamChange);
  document.getElementById('waist').addEventListener('input', onParamChange);
  document.getElementById('distance').addEventListener('input', onParamChange);
  document.getElementById('visualScale').addEventListener('input', onVisualScaleChange);
  
  // 发光参数监听
  document.getElementById('bloomStrength').addEventListener('input', onGlowParamChange);
  document.getElementById('bloomRadius').addEventListener('input', onGlowParamChange);
  
  // 粒子参数监听
  document.getElementById('particleSpeed').addEventListener('input', onParticleParamChange);
  
  // TEM00模式参数监听
  document.getElementById('temObserveZ').addEventListener('input', onTEMParamChange);
}

function onParamChange() {
  wavelength = parseFloat(document.getElementById('wavelength').value) || 632.8;
  waist = parseFloat(document.getElementById('waist').value) || 0.5;
  maxDistance = parseFloat(document.getElementById('distance').value) || 3;
  updateAll();
}

function onVisualScaleChange() {
  visualScale = parseFloat(document.getElementById('visualScale').value) * 100 || 500;
  document.querySelector('.scale-value').textContent = (visualScale / 100).toFixed(1) + 'x';
  updateAll();
}

function onGlowParamChange() {
  glowStrength = parseFloat(document.getElementById('bloomStrength').value) || 1.5;
  glowRadius = parseFloat(document.getElementById('bloomRadius').value) || 0.8;
  
  document.querySelectorAll('.range-value').forEach((el, i) => {
    const values = [glowStrength.toFixed(1), glowRadius.toFixed(1)];
    el.textContent = values[i];
  });
  
  updateGlow();
}

function calculateZR() {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  return Math.PI * waistMeter * waistMeter / lambdaMeter;
}

function calculateTheta() {
  const waistMeter = waist * 1e-3;
  const lambdaMeter = wavelength * 1e-9;
  return lambdaMeter / (Math.PI * waistMeter);
}

function calculateBeamRadius(z) {
  const zR = calculateZR();
  const waistMeter = waist * 1e-3;
  return waistMeter * Math.sqrt(1 + Math.pow(z / zR, 2));
}

function createBeam() {
  // 移除旧的光束
  if (beamMesh) {
    scene.remove(beamMesh);
    beamMesh.geometry.dispose();
    beamMesh.material.dispose();
  }
  
  if (glowMesh) {
    scene.remove(glowMesh);
    glowMesh.geometry.dispose();
    glowMesh.material.dispose();
  }
  
  const zR = calculateZR();
  const displayLength = maxDistance * 1.5;
  const startZ = -displayLength * 0.5;
  const endZ = displayLength * 0.5;
  const segmentsZ = 80;
  const radialSegments = 36;
  
  const positions = [];
  const normals = [];
  const indices = [];
  
  for (let i = 0; i <= segmentsZ; i++) {
    const z = startZ + (endZ - startZ) * (i / segmentsZ);
    const r = calculateBeamRadius(z) * visualScale;
    
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      
      positions.push(x, y, z);
      
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const nz = 0;
      normals.push(nx, ny, nz);
    }
  }
  
  for (let i = 0; i < segmentsZ; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const v1 = i * radialSegments + j;
      const v2 = (i + 1) * radialSegments + j;
      const v3 = (i + 1) * radialSegments + ((j + 1) % radialSegments);
      const v4 = i * radialSegments + ((j + 1) % radialSegments);
      
      indices.push(v1, v2, v3);
      indices.push(v1, v3, v4);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  
  // 主光束材质
  const material = new THREE.MeshPhongMaterial({
    color: 0x42d7c8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    shininess: 120,
    emissive: 0x2d998f,
    emissiveIntensity: 0.5
  });
  
  beamMesh = new THREE.Mesh(geometry, material);
  scene.add(beamMesh);
  
  // 创建发光外壳
  createGlowMesh(geometry);
}

function createGlowMesh(baseGeometry) {
  const glowGeometry = baseGeometry.clone();
  
  // 缩放几何体创建发光效果
  const positions = glowGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const r = Math.sqrt(x * x + y * y);
    if (r > 0) {
      const scale = 1 + glowRadius * 0.3;
      positions[i] = x * scale;
      positions[i + 1] = y * scale;
    }
  }
  glowGeometry.attributes.position.needsUpdate = true;
  
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x42d7c8,
    transparent: true,
    opacity: glowStrength * 0.15,
    side: THREE.DoubleSide
  });
  
  glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glowMesh);
  
  // 创建第二层发光
  const glowGeometry2 = baseGeometry.clone();
  const positions2 = glowGeometry2.attributes.position.array;
  for (let i = 0; i < positions2.length; i += 3) {
    const x = positions2[i];
    const y = positions2[i + 1];
    const z = positions2[i + 2];
    const r = Math.sqrt(x * x + y * y);
    if (r > 0) {
      const scale = 1 + glowRadius * 0.6;
      positions2[i] = x * scale;
      positions2[i + 1] = y * scale;
    }
  }
  glowGeometry2.attributes.position.needsUpdate = true;
  
  const glowMaterial2 = new THREE.MeshBasicMaterial({
    color: 0x42d7c8,
    transparent: true,
    opacity: glowStrength * 0.08,
    side: THREE.DoubleSide
  });
  
  const glowMesh2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
  scene.add(glowMesh2);
  
  // 存储引用用于更新
  glowMesh.secondLayer = glowMesh2;
}

function updateGlow() {
  if (glowMesh) {
    glowMesh.material.opacity = glowStrength * 0.15;
    if (glowMesh.secondLayer) {
      glowMesh.secondLayer.material.opacity = glowStrength * 0.08;
    }
  }
}

function toggleGlow() {
  glowEnabled = !glowEnabled;
  
  if (glowEnabled) {
    document.getElementById('bloomToggle').textContent = '💡 关闭发光';
    if (glowMesh) {
      glowMesh.visible = true;
      if (glowMesh.secondLayer) {
        glowMesh.secondLayer.visible = true;
      }
    }
  } else {
    document.getElementById('bloomToggle').textContent = '💡 开启发光';
    if (glowMesh) {
      glowMesh.visible = false;
      if (glowMesh.secondLayer) {
        glowMesh.secondLayer.visible = false;
      }
    }
  }
}

function createParticles() {
  if (particles) {
    scene.remove(particles);
    particles.geometry.dispose();
    particles.material.dispose();
  }
  
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(particleCount * 3);
  particleVelocities = new Float32Array(particleCount * 3);
  
  const colors = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    resetParticle(i);
    
    const color = new THREE.Color(0x42d7c8);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
  });
  
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function resetParticle(index) {
  const zR = calculateZR();
  const waistMeter = waist * 1e-3;
  
  // 使用高斯分布生成粒子位置
  const u1 = Math.random();
  const u2 = Math.random();
  const r = waistMeter * visualScale * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  const phi = Math.random() * Math.PI * 2;
  const x = r * Math.cos(phi);
  const y = r * Math.sin(phi);
  
  // 粒子从束腰区域开始
  const z = -zR * 0.5 + Math.random() * zR;
  
  particlePositions[index * 3] = x;
  particlePositions[index * 3 + 1] = y;
  particlePositions[index * 3 + 2] = z;
  
  // 沿Z轴正方向运动
  particleVelocities[index * 3] = 0;
  particleVelocities[index * 3 + 1] = 0;
  particleVelocities[index * 3 + 2] = (0.5 + Math.random() * 0.5) * particleSpeed * 0.02;
}

function updateParticles() {
  if (!particles || !particleEnabled) return;
  
  const zR = calculateZR();
  const displayLength = maxDistance * 1.5;
  const endZ = displayLength * 0.5;
  const startZ = -displayLength * 0.5;
  
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3 + 2] += particleVelocities[i * 3 + 2] * particleSpeed;
    
    // 如果粒子超出范围，重置到起点
    if (particlePositions[i * 3 + 2] > endZ) {
      resetParticle(i);
      particlePositions[i * 3 + 2] = startZ + Math.random() * zR * 0.3;
    }
  }
  
  particles.geometry.attributes.position.needsUpdate = true;
}

function onParticleParamChange() {
  particleSpeed = parseFloat(document.getElementById('particleSpeed').value) || 1.0;
  document.querySelector('.particle-speed-value').textContent = particleSpeed.toFixed(1) + 'x';
}

function toggleParticles() {
  particleEnabled = !particleEnabled;
  
  if (particleEnabled) {
    document.getElementById('particleToggle').textContent = '✨ 关闭粒子';
    if (particles) {
      particles.visible = true;
    }
  } else {
    document.getElementById('particleToggle').textContent = '✨ 开启粒子';
    if (particles) {
      particles.visible = false;
    }
  }
}

function createEnergyCloud() {
  if (energyCloud) {
    scene.remove(energyCloud);
    energyCloud.geometry.dispose();
    energyCloud.material.dispose();
  }
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(energyCloudCount * 3);
  const sizes = new Float32Array(energyCloudCount);
  const colors = new Float32Array(energyCloudCount * 3);
  
  const zR = calculateZR();
  const waistMeter = waist * 1e-3;
  const displayLength = maxDistance * 1.5;
  const startZ = -displayLength * 0.5;
  const endZ = displayLength * 0.5;
  
  for (let i = 0; i < energyCloudCount; i++) {
    const z = startZ + Math.random() * (endZ - startZ);
    const wZ = calculateBeamRadius(z) * visualScale;
    
    const u1 = Math.random();
    const u2 = Math.random();
    const r = wZ * Math.sqrt(-0.5 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const phi = Math.random() * Math.PI * 2;
    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    const normalizedR = Math.abs(r) / wZ;
    const intensity = Math.exp(-2 * normalizedR * normalizedR);
    
    const size = 0.03 + intensity * 0.07;
    sizes[i] = size;
    
    const color = new THREE.Color();
    color.setHSL(0.52, 0.8, 0.3 + intensity * 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      
      varying vec3 vColor;
      varying float vIntensity;
      
      void main() {
        vColor = color;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        float distance = length(gl_PointCoord - vec2(0.5));
        if (distance > 0.5) discard;
        
        float alpha = smoothstep(0.5, 0.0, distance);
        gl_FragColor = vec4(vColor, alpha * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  energyCloud = new THREE.Points(geometry, material);
  scene.add(energyCloud);
}

function toggleEnergyCloud() {
  energyCloudEnabled = !energyCloudEnabled;
  
  if (energyCloudEnabled) {
    document.getElementById('energyCloudToggle').textContent = '☁️ 关闭能量云';
    if (energyCloud) {
      energyCloud.visible = true;
    }
  } else {
    document.getElementById('energyCloudToggle').textContent = '☁️ 开启能量云';
    if (energyCloud) {
      energyCloud.visible = false;
    }
  }
}

function onTEMParamChange() {
  temObserveZ = parseFloat(document.getElementById('temObserveZ').value) || 0;
  document.querySelector('.tem-z-value').textContent = temObserveZ.toFixed(2) + ' m';
  
  if (temModeEnabled) {
    updateTEMMode();
  }
}

function toggleTEMMode() {
  temModeEnabled = !temModeEnabled;
  
  const panel = document.getElementById('temPanel');
  
  if (temModeEnabled) {
    document.getElementById('temToggle').textContent = '📊 关闭模式';
    panel.style.display = 'block';
    initTEMMode();
    updateTEMMode();
  } else {
    document.getElementById('temToggle').textContent = '📊 开启模式';
    panel.style.display = 'none';
  }
}

function initTEMMode() {
  const container = document.getElementById('tem3dContainer');
  
  if (!temScene) {
    temScene = new THREE.Scene();
    temScene.background = new THREE.Color(0xf5f6f8);
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    temCamera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100);
    temCamera.position.set(0, 0, 2);
    temCamera.lookAt(0, 0, 0);
    
    temRenderer = new THREE.WebGLRenderer({ antialias: true });
    temRenderer.setSize(width, height);
    container.appendChild(temRenderer.domElement);
    
    temLight = new THREE.DirectionalLight(0xffffff, 1);
    temLight.position.set(1, 1, 1);
    temScene.add(temLight);
    
    temAmbient = new THREE.AmbientLight(0x404040, 0.5);
    temScene.add(temAmbient);
  }
}

function updateTEMMode() {
  const wZ = calculateBeamRadius(temObserveZ) * 1000;
  document.getElementById('temBeamRadius').textContent = wZ.toFixed(3) + ' mm';
  
  drawHeatmap();
  drawCurve();
  drawTEM3D();
}

function drawHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  const wZ = calculateBeamRadius(temObserveZ) * 1000;
  const maxRadius = 3;
  
  const imageData = ctx.createImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (x - width / 2) / width * maxRadius;
      const py = (y - height / 2) / height * maxRadius;
      const r = Math.sqrt(px * px + py * py);
      
      const intensity = Math.exp(-2 * r * r / (wZ * wZ));
      
      const i = (y * width + x) * 4;
      
      const color = getIntensityColor(intensity);
      imageData.data[i] = color.r;
      imageData.data[i + 1] = color.g;
      imageData.data[i + 2] = color.b;
      imageData.data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function getIntensityColor(intensity) {
  const r = Math.floor(66 + intensity * 189);
  const g = Math.floor(215 * intensity);
  const b = Math.floor(200 * intensity);
  return { r, g, b };
}

function drawCurve() {
  const canvas = document.getElementById('curveCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(0, 0, width, height);

  const wZ = calculateBeamRadius(temObserveZ) * 1000;
  const maxRadius = 3;

  ctx.strokeStyle = '#42d7c8';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let x = 0; x < width; x++) {
    const px = (x - width / 2) / width * maxRadius;
    const intensity = Math.exp(-2 * px * px / (wZ * wZ));
    const y = height - intensity * (height - 20) - 10;

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 10);
  ctx.lineTo(width, height - 10);
  ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font = '10px Arial';
  ctx.fillText('r', width - 10, height - 5);
  ctx.fillText('I(r)', 5, 15);
}

function drawTEM3D() {
  if (!temScene) return;
  
  if (temMesh) {
    temScene.remove(temMesh);
    temMesh.geometry.dispose();
    temMesh.material.dispose();
  }
  
  const wZ = calculateBeamRadius(temObserveZ) * 1000;
  const size = 6;
  const segments = 50;
  
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geometry.attributes.position.array;
  const colors = new Float32Array(positions.length);
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const r = Math.sqrt(x * x + y * y);
    
    const intensity = Math.exp(-2 * r * r / (wZ * wZ));
    positions[i + 2] = intensity * 0.5;
    
    const color = new THREE.Color();
    color.setHSL(0.52, 0.8, 0.3 + intensity * 0.6);
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 50
  });
  
  temMesh = new THREE.Mesh(geometry, material);
  temMesh.rotation.x = -Math.PI / 4;
  temScene.add(temMesh);
  
  temRenderer.render(temScene, temCamera);
}

function createAxis() {
  if (axisLines) {
    scene.remove(axisLines);
    axisLines.geometry.dispose();
    axisLines.material.dispose();
  }
  
  const axisLength = sceneScale * 1.2;
  const points = [];
  
  points.push(new THREE.Vector3(-axisLength, 0, 0));
  points.push(new THREE.Vector3(axisLength, 0, 0));
  points.push(new THREE.Vector3(0, -axisLength, 0));
  points.push(new THREE.Vector3(0, axisLength, 0));
  points.push(new THREE.Vector3(0, 0, -axisLength));
  points.push(new THREE.Vector3(0, 0, axisLength));
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const colors = new Float32Array([
    1, 0.3, 0.3,
    1, 0.3, 0.3,
    0.3, 1, 0.3,
    0.3, 1, 0.3,
    0.3, 1, 1,
    0.3, 1, 1
  ]);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const material = new THREE.LineBasicMaterial({ 
    vertexColors: true, 
    linewidth: 3 
  });
  
  axisLines = new THREE.LineSegments(geometry, material);
  scene.add(axisLines);
  
  addAxisLabel('X', new THREE.Vector3(axisLength * 1.1, 0, 0), 0xff6666);
  addAxisLabel('Y', new THREE.Vector3(0, axisLength * 1.1, 0), 0x66ff66);
  addAxisLabel('Z', new THREE.Vector3(0, 0, axisLength * 1.1), 0x66ffff);
}

function addAxisLabel(text, position, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 128;
  canvas.height = 32;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 22px Arial';
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, 24);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true 
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.copy(position);
  sprite.scale.set(0.5, 0.125, 1);
  scene.add(sprite);
}

function createCrossSections() {
  clearCrossSections();
  
  const zR = calculateZR();
  const positions = [-zR, 0, zR];
  
  positions.forEach((z, index) => {
    const r = calculateBeamRadius(z) * visualScale;
    
    const ringGeometry = new THREE.RingGeometry(r * 0.9, r * 1.1, 64);
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77'];
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: colors[index],
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0, z);
    scene.add(ring);
    crossSections.push(ring);
    
    const discGeometry = new THREE.RingGeometry(0, r * 0.85, 32);
    const discMaterial = new THREE.MeshBasicMaterial({
      color: colors[index],
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.position.set(0, 0, z);
    scene.add(disc);
    crossSections.push(disc);
  });
}

function clearCrossSections() {
  crossSections.forEach(obj => {
    scene.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  });
  crossSections = [];
}

function createZMarkers() {
  clearZMarkers();
  
  const zR = calculateZR();
  const waistMeter = waist * 1e-3;
  const maxRadius = waistMeter * visualScale * 1.2;
  
  // 添加虚线标记
  const dashedLineGeometry = new THREE.BufferGeometry();
  dashedLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -zR, maxRadius, 0,
    0, maxRadius, 0,
    0, maxRadius, 0,
    zR, maxRadius, 0
  ], 3));
  
  const dashedLineMaterial = new THREE.LineDashedMaterial({
    color: 0xffff00,
    dashSize: 0.15,
    gapSize: 0.1,
    linewidth: 2
  });
  
  const dashedLine = new THREE.LineSegments(dashedLineGeometry, dashedLineMaterial);
  dashedLine.computeLineDistances();
  scene.add(dashedLine);
  zMarkers.push(dashedLine);
  
  // 添加 zR 长度标注
  const zRLabelGeometry = new THREE.BufferGeometry();
  zRLabelGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -zR, maxRadius + 0.3, 0,
    zR, maxRadius + 0.3, 0
  ], 3));
  
  const zRLabelMaterial = new THREE.LineBasicMaterial({
    color: 0xffaa00,
    linewidth: 1
  });
  
  const zRLabelLine = new THREE.Line(zRLabelGeometry, zRLabelMaterial);
  scene.add(zRLabelLine);
  zMarkers.push(zRLabelLine);
  
  addArrow(-zR, maxRadius + 0.3, 0, -0.3, 0, 0);
  addArrow(zR, maxRadius + 0.3, 0, 0.3, 0, 0);
  
  const positions = [
    { z: -zR, label: '-zR' },
    { z: 0, label: '束腰' },
    { z: zR, label: '+zR' }
  ];
  
  positions.forEach(pos => {
    // 小坐标轴标记
    const axisLength = 0.5;
    
    // X轴
    const xAxisGeometry = new THREE.BufferGeometry();
    xAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      pos.z, 0, -axisLength,
      pos.z, 0, axisLength
    ], 3));
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff6666 });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    scene.add(xAxis);
    zMarkers.push(xAxis);
    
    // Y轴
    const yAxisGeometry = new THREE.BufferGeometry();
    yAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      pos.z, -axisLength, 0,
      pos.z, axisLength, 0
    ], 3));
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x66ff66 });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    scene.add(yAxis);
    zMarkers.push(yAxis);
    
    // 无黑框文字标注
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 32;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffff00';
    ctx.textAlign = 'center';
    ctx.fillText(pos.label, canvas.width / 2, 22);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(pos.z, axisLength + 0.2, 0);
    sprite.scale.set(0.8, 0.2, 1);
    scene.add(sprite);
    zMarkers.push(sprite);
  });
  
  // 添加 zR 文字标注
  const zRTextCanvas = document.createElement('canvas');
  const zRTextCtx = zRTextCanvas.getContext('2d');
  zRTextCanvas.width = 128;
  zRTextCanvas.height = 32;
  zRTextCtx.clearRect(0, 0, zRTextCanvas.width, zRTextCanvas.height);
  zRTextCtx.font = 'bold 14px Arial';
  zRTextCtx.fillStyle = '#ffaa00';
  zRTextCtx.textAlign = 'center';
  zRTextCtx.fillText('2zR', 64, 22);
  
  const zRTextTexture = new THREE.CanvasTexture(zRTextCanvas);
  zRTextTexture.needsUpdate = true;
  const zRTextSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: zRTextTexture,
    transparent: true,
    opacity: 0.9
  }));
  zRTextSprite.position.set(0, maxRadius + 0.6, 0);
  zRTextSprite.scale.set(0.6, 0.15, 1);
  scene.add(zRTextSprite);
  zMarkers.push(zRTextSprite);
}

function addArrow(x, y, z, dx, dy, dz) {
  const arrowLength = 0.2;
  const arrowGeometry = new THREE.ConeGeometry(0.08, arrowLength, 8);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrow.position.set(x + dx * 0.5, y + dy * 0.5, z + dz * 0.5);
  
  const direction = new THREE.Vector3(dx, dy, dz).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  arrow.setRotationFromQuaternion(quaternion);
  
  scene.add(arrow);
  zMarkers.push(arrow);
}

function clearZMarkers() {
  zMarkers.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  zMarkers = [];
}

function updateDataDisplay() {
  const zR = calculateZR();
  const theta = calculateTheta();
  const currentRadius = calculateBeamRadius(0) * 1000;
  
  document.getElementById('zRValue').textContent = zR.toFixed(4) + ' m';
  document.getElementById('thetaValue').textContent = (theta * 1000).toFixed(4) + ' mrad';
  document.getElementById('beamRadiusValue').textContent = currentRadius.toFixed(4) + ' mm';
}

function updateAll() {
  createBeam();
  createCrossSections();
  createZMarkers();
  createParticles();
  createEnergyCloud();
  updateDataDisplay();
}

function resetParameters() {
  wavelength = 632.8;
  waist = 0.5;
  maxDistance = 3;
  visualScale = 500;
  glowStrength = 1.5;
  glowRadius = 0.8;
  
  document.getElementById('wavelength').value = wavelength;
  document.getElementById('waist').value = waist;
  document.getElementById('distance').value = maxDistance;
  document.getElementById('visualScale').value = 5;
  document.querySelector('.scale-value').textContent = '5.0x';
  
  document.getElementById('bloomStrength').value = glowStrength;
  document.getElementById('bloomRadius').value = glowRadius;
  document.querySelectorAll('.range-value').forEach((el, i) => {
    const values = [glowStrength.toFixed(1), glowRadius.toFixed(1)];
    el.textContent = values[i];
  });
  
  updateAll();
}

let autoRotate = false;

function toggleAutoRotate() {
  autoRotate = !autoRotate;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 2.0;
}

function onWindowResize() {
  const container = document.getElementById('scene-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateParticles();
  renderer.render(scene, camera);
}

function goBack() {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);