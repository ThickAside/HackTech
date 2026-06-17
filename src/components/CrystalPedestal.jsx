import React, { useEffect, useRef } from 'react';

export default function CrystalPedestal() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = 0, height = 0;
    let animationFrameId;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Geometries Columns
    function createColumn(cx, cy, cz, w, h, d) {
      return [
        {x: cx - w/2, y: cy - h/2, z: cz - d/2},
        {x: cx + w/2, y: cy - h/2, z: cz - d/2},
        {x: cx + w/2, y: cy + h/2, z: cz - d/2},
        {x: cx - w/2, y: cy + h/2, z: cz - d/2},
        {x: cx - w/2, y: cy - h/2, z: cz + d/2},
        {x: cx + w/2, y: cy - h/2, z: cz + d/2},
        {x: cx + w/2, y: cy + h/2, z: cz + d/2},
        {x: cx - w/2, y: cy + h/2, z: cz + d/2}
      ];
    }

    const columns = [
      { points: createColumn(0, -10, 0, 38, 120, 38), color: 'primary' },
      { points: createColumn(-55, 30, 20, 24, 75, 24), color: 'accent' },
      { points: createColumn(55, -25, -20, 20, 80, 20), color: 'accent2' }
    ];

    const faces = [
      { indices: [0, 1, 2, 3], name: 'front' },
      { indices: [5, 4, 7, 6], name: 'back' },
      { indices: [4, 5, 1, 0], name: 'top' },
      { indices: [3, 2, 6, 7], name: 'bottom' },
      { indices: [4, 0, 3, 7], name: 'left' },
      { indices: [1, 5, 6, 2], name: 'right' }
    ];

    let currentRotX = -0.15;
    let currentRotY = 0;
    let timeAngle = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Interpolation for cursor tilt
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      timeAngle += 0.005;
      const time = timeAngle;
      const targetRotY = time + (mouseX - window.innerWidth / 2) * 0.0008;
      const targetRotX = -0.15 + (mouseY - window.innerHeight / 2) * 0.0008;

      currentRotX += (targetRotX - currentRotX) * 0.1;
      currentRotY += (targetRotY - currentRotY) * 0.1;

      // Render pedestal shadow
      ctx.save();
      ctx.translate(width / 2, height / 2 + 100);
      const pedGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 90);
      pedGrad.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
      pedGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
      pedGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = pedGrad;
      ctx.scale(2.2, 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pedestal Ring Border
      ctx.save();
      ctx.translate(width / 2, height / 2 + 100);
      ctx.scale(2.2, 0.45);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.03)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const allFaces = [];

      columns.forEach((col, colIdx) => {
        const floatOffset = Math.sin(time * 2 + colIdx * 3) * 6;

        const rotatedPts = col.points.map(pt => {
          let p = { x: pt.x, y: pt.y + floatOffset, z: pt.z };

          // Y Rotation
          let c = Math.cos(currentRotY), s = Math.sin(currentRotY);
          let x1 = p.x * c + p.z * s;
          let z1 = -p.x * s + p.z * c;

          // X Rotation
          c = Math.cos(currentRotX); s = Math.sin(currentRotX);
          let y2 = p.y * c - z1 * s;
          let z2 = p.y * s + z1 * c;

          const dist = 320;
          const scaleProj = 260 / (z2 + dist);
          return {
            x: x1 * scaleProj + width / 2,
            y: y2 * scaleProj + height / 2 - 10,
            z: z2
          };
        });

        faces.forEach(face => {
          const pts = face.indices.map(idx => rotatedPts[idx]);
          const avgZ = pts.reduce((sum, p) => sum + p.z, 0) / pts.length;

          allFaces.push({
            pts,
            avgZ,
            colIdx,
            faceName: face.name,
            color: col.color
          });
        });
      });

      allFaces.sort((a, b) => b.avgZ - a.avgZ);

      allFaces.forEach(face => {
        const pts = face.pts;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();

        let grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y);

        if (face.color === 'primary') {
          if (face.faceName === 'top') {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
            grad.addColorStop(1, 'rgba(37, 99, 235, 0.25)');
          } else if (face.faceName === 'left' || face.faceName === 'right') {
            grad.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
          } else {
            grad.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
          }
        } else if (face.color === 'accent') {
          if (face.faceName === 'top') {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
          } else {
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            grad.addColorStop(1, 'rgba(37, 99, 235, 0.1)');
          }
        } else {
          if (face.faceName === 'top') {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(37, 99, 235, 0.35)');
          } else {
            grad.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
            grad.addColorStop(1, 'rgba(16, 185, 129, 0.08)');
          }
        }

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = face.color === 'primary' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(16, 185, 129, 0.25)';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative w-full h-[220px] select-none pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
      <div className="absolute inset-0 bg-transparent pointer-events-none" />
    </div>
  );
}
