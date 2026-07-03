import { useEffect, useRef } from 'react';
import type { Candle } from '../lib/types';

interface Props {
  candles: Candle[];
  symbol: string;
  height?: number;
  showVolume?: boolean;
}

export function CandleChart({ candles, symbol, height = 280, showVolume = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = height;
    const volH = showVolume ? 40 : 0;
    const chartH = h - volH - 20;
    const padding = { top: 10, right: 60, bottom: 20, left: 0 };

    const prices = candles.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.0001;
    const padRange = range * 0.1;
    const yMin = min - padRange;
    const yMax = max + padRange;

    const chartW = w - padding.right - padding.left;
    const candleW = chartW / candles.length;
    const bodyW = Math.max(2, candleW * 0.6);

    ctx.clearRect(0, 0, w, h);

    // grid lines
    ctx.strokeStyle = 'rgba(40, 49, 80, 0.4)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#5a6688';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const price = yMax - ((yMax - yMin) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(price.toFixed(symbol.includes('JPY') ? 2 : 4), w - padding.right + 4, y + 3);
    }

    // candles
    candles.forEach((c, i) => {
      const x = padding.left + i * candleW + candleW / 2;
      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#f43f5e';
      const yHigh = padding.top + ((yMax - c.high) / (yMax - yMin)) * chartH;
      const yLow = padding.top + ((yMax - c.low) / (yMax - yMin)) * chartH;
      const yOpen = padding.top + ((yMax - c.open) / (yMax - yMin)) * chartH;
      const yClose = padding.top + ((yMax - c.close) / (yMax - yMin)) * chartH;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    // volume bars
    if (showVolume) {
      const maxVol = Math.max(...candles.map((c) => c.volume));
      const volTop = h - volH;
      candles.forEach((c, i) => {
        const x = padding.left + i * candleW + candleW / 2;
        const isBull = c.close >= c.open;
        const barH = (c.volume / maxVol) * (volH - 5);
        ctx.fillStyle = isBull ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)';
        ctx.fillRect(x - bodyW / 2, volTop + (volH - barH), bodyW, barH);
      });
    }

    // current price line
    const last = candles[candles.length - 1];
    const lastY = padding.top + ((yMax - last.close) / (yMax - yMin)) * chartH;
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, lastY);
    ctx.lineTo(w - padding.right, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(w - padding.right, lastY - 8, padding.right, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(last.close.toFixed(symbol.includes('JPY') ? 2 : 4), w - padding.right + 4, lastY + 3);
  }, [candles, symbol, height, showVolume]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="rounded-lg"
    />
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({ data, color = '#38bdf8', height = 40, width = 120 }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = grad;
    ctx.fill();
  }, [data, color, height, width]);

  return <canvas ref={canvasRef} style={{ width, height }} />;
}
