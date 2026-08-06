/**
 * 高斯光束物理计算工具函数
 */

/**
 * 纳米转米
 */
export function nmToM(nm) {
  return nm * 1e-9;
}

/**
 * 毫米转米
 */
export function mmToM(mm) {
  return mm * 1e-3;
}

/**
 * 计算高斯光束参数
 * @param {number} wavelength - 波长 (nm)
 * @param {number} waist - 束腰 (mm)
 * @param {number} distance - 传播距离 (m)
 * @returns {{ rayleighLength: number, beamRadius: number, divergenceAngle: number, waistMeter: number, wavelengthMeter: number }}
 */
export function calculateGaussianBeam(wavelength, waist, distance = 0) {
  const wavelengthMeter = nmToM(wavelength);
  const waistMeter = mmToM(waist);
  const rayleighLength = Math.PI * waistMeter * waistMeter / wavelengthMeter;
  const beamRadius = waistMeter * Math.sqrt(1 + Math.pow(distance / rayleighLength, 2));
  const divergenceAngle = wavelengthMeter / (Math.PI * waistMeter);

  return {
    rayleighLength,
    beamRadius,
    divergenceAngle,
    waistMeter,
    wavelengthMeter
  };
}

/**
 * 生成光束半径曲线数据
 * @param {number} wavelength - 波长 (nm)
 * @param {number} waist - 束腰 (mm)
 * @param {number} maxDistance - 最大传播距离 (m)
 * @param {number} points - 数据点数
 * @returns {Array<[number, number]>}
 */
export function generateBeamCurveData(wavelength, waist, maxDistance, points = 100) {
  const { rayleighLength } = calculateGaussianBeam(wavelength, waist);
  const waistMeter = mmToM(waist);
  const data = [];

  for (let i = 0; i <= points; i++) {
    const z = (i / points) * maxDistance;
    const w = waistMeter * Math.sqrt(1 + Math.pow(z / rayleighLength, 2));
    data.push([z, w]);
  }

  return { data, rayleighLength };
}

/**
 * 格式化数值
 */
export function fmt(val, decimals = 6) {
  if (val === null || val === undefined || isNaN(val)) return '--';
  return val.toFixed(decimals);
}

/**
 * 生成 CSV 数据
 */
export function generateCSV(records) {
  if (!records || records.length === 0) return '';
  const headers = ['时间', '实验名称', '波长λ(nm)', '束腰w₀(mm)', '传播距离z(m)', '瑞利长度zR(m)', '发散角θ(mrad)', '光束半径w(z)(mm)'];
  const rows = records.map(r => [
    new Date(r.timestamp).toLocaleString('zh-CN'),
    r.experimentName || '',
    r.wavelength,
    r.waist,
    (r.z || 0).toFixed(4),
    r.zR.toFixed(6),
    (r.theta * 1000).toFixed(6),
    (r.beamRadius * 1000).toFixed(6)
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
