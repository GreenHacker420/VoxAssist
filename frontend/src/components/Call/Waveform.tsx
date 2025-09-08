'use client';

import { useEffect, useRef } from 'react';

interface WaveformProps {
  isTalking: boolean;
}

export default function Waveform({ isTalking }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const draw = (amplitude: number) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(79, 70, 229)';

      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = height / 2 + amplitude * Math.sin(x * 0.05 + Date.now() * 0.01);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const animate = () => {
      const amplitude = isTalking ? Math.random() * 20 + 5 : 2;
      draw(amplitude);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isTalking]);

  return <canvas ref={canvasRef} width="300" height="50" />;
}
