import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { calculateGaussianBeam } from '../utils/gaussian';
import '../styles/lab-pages.css';

function makeBeamGeometry(wavelength, waist, distance, visualScale) {
  const axialSegments = 96;
  const radialSegments = 32;
  const positions = [];
  const indices = [];

  for (let i = 0; i <= axialSegments; i += 1) {
    const x = -6 + 12 * i / axialSegments;
    const z = Math.abs(x / 6) * distance;
    const result = calculateGaussianBeam(wavelength, waist, z);
    const relativeRadius = result.beamRadius / result.waistMeter;
    const radius = Math.min(2.65, 0.42 * visualScale * relativeRadius);
    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = Math.PI * 2 * j / radialSegments;
      positions.push(x, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }

  const row = radialSegments + 1;
  for (let i = 0; i < axialSegments; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * row + j;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material?.dispose();
  });
}

function intensityColor(value) {
  const t = Math.max(0, Math.min(1, value));
  return [Math.round(30 + 225 * t), Math.round(80 + 175 * t), Math.round(100 + 155 * t)];
}

function drawTemPanels(heatmap, curve, surface, beamRadiusMm) {
  if (!heatmap || !curve || !surface) return;
  const heat = heatmap.getContext('2d');
  const image = heat.createImageData(220, 220);
  for (let y = 0; y < 220; y += 1) {
    for (let x = 0; x < 220; x += 1) {
      const nx = (x - 110) / 55;
      const ny = (y - 110) / 55;
      const intensity = Math.exp(-2 * (nx * nx + ny * ny));
      const [r, g, b] = intensityColor(intensity);
      const index = (y * 220 + x) * 4;
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = Math.round(255 * Math.min(1, intensity * 1.35));
    }
  }
  heat.clearRect(0, 0, 220, 220);
  heat.fillStyle = '#071822';
  heat.fillRect(0, 0, 220, 220);
  heat.putImageData(image, 0, 0);

  const line = curve.getContext('2d');
  line.clearRect(0, 0, 260, 150);
  line.fillStyle = '#071822';
  line.fillRect(0, 0, 260, 150);
  line.strokeStyle = '#2dd4bf';
  line.lineWidth = 2;
  line.beginPath();
  for (let x = 16; x <= 244; x += 1) {
    const normalized = (x - 130) / 52;
    const intensity = Math.exp(-2 * normalized * normalized);
    const y = 128 - intensity * 105;
    x === 16 ? line.moveTo(x, y) : line.lineTo(x, y);
  }
  line.stroke();
  line.fillStyle = '#a7f3d0';
  line.font = '12px Microsoft YaHei';
  line.fillText(`w(z) = ${beamRadiusMm.toFixed(3)} mm`, 16, 18);

  const ctx = surface.getContext('2d');
  ctx.clearRect(0, 0, 260, 180);
  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, '#0c2632');
  gradient.addColorStop(1, '#061219');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 260, 180);
  for (let row = -5; row <= 5; row += 1) {
    ctx.strokeStyle = `rgba(45,212,191,${0.25 + (5 - Math.abs(row)) * 0.07})`;
    ctx.beginPath();
    for (let column = -40; column <= 40; column += 1) {
      const intensity = Math.exp(-0.045 * (column * column + row * row * 18));
      const x = 130 + column * 2.6 + row * 4;
      const y = 145 + row * 5 - intensity * 95;
      column === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export default function Beam3D() {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const beamGroupRef = useRef(null);
  const particleDataRef = useRef(null);
  const speedRef = useRef(1);
  const [ready, setReady] = useState(false);
  const [params, setParams] = useState({ wavelength: 632.8, waist: 0.5, distance: 3 });
  const [visualScale, setVisualScale] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [glow, setGlow] = useState(true);
  const [glowStrength, setGlowStrength] = useState(1.5);
  const [particles, setParticles] = useState(true);
  const [particleSpeed, setParticleSpeed] = useState(1);
  const [energyCloud, setEnergyCloud] = useState(true);
  const [temMode, setTemMode] = useState(false);
  const [temZ, setTemZ] = useState(0);
  const heatmapRef = useRef(null);
  const curveRef = useRef(null);
  const surfaceRef = useRef(null);

  const result = useMemo(() => calculateGaussianBeam(params.wavelength, params.waist, params.distance), [params]);
  const temResult = useMemo(() => calculateGaussianBeam(params.wavelength, params.waist, temZ), [params, temZ]);

  useEffect(() => { speedRef.current = particleSpeed; }, [particleSpeed]);
  useEffect(() => { if (controlsRef.current) controlsRef.current.autoRotate = autoRotate; }, [autoRotate]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06131c);
    scene.fog = new THREE.Fog(0x06131c, 15, 28);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(9, 6, 9);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotateSpeed = 1.4;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x8edbd3, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(5, 8, 7);
    scene.add(keyLight);
    const grid = new THREE.GridHelper(16, 16, 0x245c69, 0x153844);
    grid.position.y = -3;
    scene.add(grid);
    const axes = new THREE.AxesHelper(4);
    scene.add(axes);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    sceneRef.current = scene;
    setReady(true);
    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const particleData = particleDataRef.current;
      if (particleData) {
        const positions = particleData.attribute.array;
        for (let index = 0; index < positions.length; index += 3) {
          positions[index] += 0.018 * speedRef.current;
          if (positions[index] > 6) positions[index] = -6;
        }
        particleData.attribute.needsUpdate = true;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      controlsRef.current = null;
      particleDataRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene) return undefined;
    if (beamGroupRef.current) {
      scene.remove(beamGroupRef.current);
      disposeObject(beamGroupRef.current);
    }

    const group = new THREE.Group();
    const geometry = makeBeamGeometry(params.wavelength, params.waist, params.distance, visualScale);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4fffe4, emissive: 0x19a99b, emissiveIntensity: glowStrength,
      transparent: true, opacity: 0.32, roughness: 0.2, metalness: 0.05,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    group.add(new THREE.Mesh(geometry, material));

    if (glow) {
      const glowMesh = new THREE.Mesh(geometry.clone(), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.09 + glowStrength * 0.025, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      glowMesh.scale.set(1, 1.18, 1.18);
      group.add(glowMesh);
    }

    for (let index = -4; index <= 4; index += 2) {
      const z = Math.abs(index / 4) * params.distance;
      const local = calculateGaussianBeam(params.wavelength, params.waist, z);
      const radius = Math.min(2.65, 0.42 * visualScale * local.beamRadius / local.waistMeter);
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.98, radius, 48), new THREE.MeshBasicMaterial({ color: 0x8fffe9, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.y = Math.PI / 2;
      ring.position.x = index * 1.5;
      group.add(ring);
    }

    particleDataRef.current = null;
    if (particles) {
      const positions = new Float32Array(600 * 3);
      for (let index = 0; index < 600; index += 1) {
        const x = -6 + Math.random() * 12;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(-Math.log(Math.max(0.001, Math.random()))) * 0.32 * visualScale;
        positions[index * 3] = x;
        positions[index * 3 + 1] = Math.cos(angle) * radius;
        positions[index * 3 + 2] = Math.sin(angle) * radius;
      }
      const particleGeometry = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(positions, 3);
      particleGeometry.setAttribute('position', attribute);
      group.add(new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xe4fff9, size: 0.055, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
      particleDataRef.current = { attribute };
    }

    if (energyCloud) {
      const positions = new Float32Array(1400 * 3);
      for (let index = 0; index < 1400; index += 1) {
        const x = -6 + Math.random() * 12;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 1.8) * 1.45 * visualScale;
        positions[index * 3] = x;
        positions[index * 3 + 1] = Math.cos(angle) * radius;
        positions[index * 3 + 2] = Math.sin(angle) * radius;
      }
      const cloudGeometry = new THREE.BufferGeometry();
      cloudGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      group.add(new THREE.Points(cloudGeometry, new THREE.PointsMaterial({ color: 0x2dd4bf, size: 0.035, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
    }

    scene.add(group);
    beamGroupRef.current = group;
    return () => {
      if (beamGroupRef.current === group) {
        scene.remove(group);
        disposeObject(group);
        beamGroupRef.current = null;
        particleDataRef.current = null;
      }
    };
  }, [energyCloud, glow, glowStrength, params, particles, ready, visualScale]);

  useEffect(() => {
    if (temMode) drawTemPanels(heatmapRef.current, curveRef.current, surfaceRef.current, temResult.beamRadius * 1000);
  }, [temMode, temResult]);

  const setParam = (name, value) => setParams(current => ({ ...current, [name]: Number(value) }));
  const reset = () => {
    setParams({ wavelength: 632.8, waist: 0.5, distance: 3 });
    setVisualScale(1); setGlowStrength(1.5); setParticleSpeed(1);
    setGlow(true); setParticles(true); setEnergyCloud(true); setTemZ(0);
  };

  return (
    <div className="lab-page beam3d-page">
      <div className="lab-page-title"><div><span className="eyebrow">INTERACTIVE 3D</span><h1>🎯 三维高斯光束</h1></div><p>拖动旋转、滚轮缩放，观察束腰和传播距离对光束包络的影响。</p></div>
      <div className={`beam3d-layout ${temMode ? 'with-tem' : ''}`}>
        <aside className="lab-card beam3d-controls">
          <h2>参数设置</h2>
          <NumberField label="波长 λ (nm)" value={params.wavelength} min="100" max="2000" step="0.1" onChange={value => setParam('wavelength', value)} />
          <NumberField label="束腰 w₀ (mm)" value={params.waist} min="0.01" max="5" step="0.01" onChange={value => setParam('waist', value)} />
          <NumberField label="传播距离 z (m)" value={params.distance} min="0.1" max="10" step="0.1" onChange={value => setParam('distance', value)} />
          <RangeField label="视觉缩放" value={visualScale} min="0.2" max="2.5" step="0.1" suffix="x" onChange={setVisualScale} />
          <div className="inline-actions"><button className="lab-button secondary" onClick={reset}>↺ 重置</button><button className={`lab-button ${autoRotate ? 'primary' : 'secondary'}`} onClick={() => setAutoRotate(value => !value)}>🔄 自动旋转</button></div>

          <h3>实时数据</h3>
          <div className="compact-metrics"><Metric label="瑞利长度 zR" value={`${result.rayleighLength.toFixed(4)} m`} /><Metric label="发散角 θ" value={`${(result.divergenceAngle * 1000).toFixed(4)} mrad`} /><Metric label="末端半径" value={`${(result.beamRadius * 1000).toFixed(3)} mm`} /></div>

          <h3>显示效果</h3>
          <Toggle label="激光发光" value={glow} onChange={setGlow} />
          {glow && <RangeField label="发光强度" value={glowStrength} min="0" max="5" step="0.1" onChange={setGlowStrength} />}
          <Toggle label="激光粒子流" value={particles} onChange={setParticles} />
          {particles && <RangeField label="粒子速度" value={particleSpeed} min="0.1" max="3" step="0.1" suffix="x" onChange={setParticleSpeed} />}
          <Toggle label="高斯能量云" value={energyCloud} onChange={setEnergyCloud} />
          <Toggle label="TEM00 模式分析" value={temMode} onChange={setTemMode} />
        </aside>

        <main className="beam-scene-card lab-card">
          <div ref={hostRef} className="beam-scene" />
          <div className="scene-help"><span>🖱 左键拖动：旋转</span><span>滚轮：缩放</span><span>右键拖动：平移</span></div>
        </main>

        {temMode && <aside className="lab-card tem-panel">
          <h2>TEM00 模式分析</h2>
          <RangeField label="观察位置 z (m)" value={temZ} min="0" max={params.distance} step="0.01" suffix=" m" onChange={setTemZ} />
          <Metric label="观察处光束半径" value={`${(temResult.beamRadius * 1000).toFixed(3)} mm`} />
          <h3>二维光强分布</h3><canvas ref={heatmapRef} width="220" height="220" />
          <h3>横截面光强曲线</h3><canvas ref={curveRef} width="260" height="150" />
          <h3>三维光强分布</h3><canvas ref={surfaceRef} width="260" height="180" />
        </aside>}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, ...props }) {
  return <label className="control-field"><span>{label}</span><input type="number" value={value} onChange={event => onChange(event.target.value)} {...props} /></label>;
}

function RangeField({ label, value, onChange, suffix = '', ...props }) {
  return <label className="control-field range-field"><span>{label}<strong>{Number(value).toFixed(2)}{suffix}</strong></span><input type="range" value={value} onChange={event => onChange(Number(event.target.value))} {...props} /></label>;
}

function Toggle({ label, value, onChange }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} /><i /></label>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
