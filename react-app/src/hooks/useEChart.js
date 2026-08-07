import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function useEChart(option) {
  const elementRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return undefined;

    const chart = echarts.init(elementRef.current);
    chartRef.current = chart;
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, { notMerge: true });
    }
  }, [option]);

  return { elementRef, chartRef };
}
