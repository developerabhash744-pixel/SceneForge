import * as THREE from 'three';

export function createProceduralTexture(type: 'grid' | 'brick' | 'wood' | 'metal' | 'default'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (!ctx) {
    return new THREE.Texture();
  }

  switch (type) {
    case 'grid': {
      // Dark slate background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 256, 256);
      
      // Neon cyan grid lines
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      
      // Draw outer borders
      ctx.strokeRect(0, 0, 256, 256);
      
      // Draw inner lines
      ctx.beginPath();
      for (let i = 32; i < 256; i += 32) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
      }
      ctx.stroke();
      break;
    }

    case 'brick': {
      // Red clay background
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 0, 256, 256);

      // Mortar lines (grey)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();

      const rows = 8;
      const rowHeight = 256 / rows;
      
      for (let i = 0; i <= rows; i++) {
        const y = i * rowHeight;
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
      }

      for (let r = 0; r < rows; r++) {
        const y = r * rowHeight;
        const offset = r % 2 === 0 ? 0 : 32;
        for (let x = offset; x <= 256 + offset; x += 64) {
          ctx.moveTo(x % 256, y);
          ctx.lineTo(x % 256, y + rowHeight);
        }
      }
      ctx.stroke();
      break;
    }

    case 'wood': {
      // Warm wood background
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 256, 256);

      // Concentric rings
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      
      // Radial rings centered near the top-left to look organic
      const cx = -20;
      const cy = -20;
      for (let r = 10; r < 400; r += 12) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + Math.sin(r) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Add wood grain noise
      ctx.fillStyle = 'rgba(69, 26, 3, 0.08)';
      for (let i = 0; i < 500; i++) {
        const rx = Math.random() * 256;
        const ry = Math.random() * 256;
        const rw = 2 + Math.random() * 15;
        const rh = 1 + Math.random() * 2;
        ctx.fillRect(rx, ry, rw, rh);
      }
      break;
    }

    case 'metal': {
      // Steel background
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#475569');
      grad.addColorStop(0.5, '#94a3b8');
      grad.addColorStop(1, '#475569');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Brushed texture (horizontal fine scratches)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 150; i++) {
        const y = Math.random() * 256;
        const w = 50 + Math.random() * 200;
        const x = Math.random() * 256 - 100;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      }

      // Darker scratches for contrast
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
      for (let i = 0; i < 100; i++) {
        const y = Math.random() * 256;
        const w = 30 + Math.random() * 100;
        const x = Math.random() * 256 - 50;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      }
      break;
    }

    default: {
      // Flat white/grey grid to represent default material
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.beginPath();
      ctx.moveTo(128, 0); ctx.lineTo(128, 256);
      ctx.moveTo(0, 128); ctx.lineTo(256, 128);
      ctx.stroke();
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}
