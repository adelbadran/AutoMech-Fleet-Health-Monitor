import { motion } from 'motion/react';

const MESH_BLOBS = [
  {
    color: 'rgba(0, 229, 255, 0.35)',
    size: 'min(55vw, 520px)',
    left: '-8%',
    top: '-12%',
    duration: 22,
    delay: 0,
  },
  {
    color: 'rgba(180, 77, 255, 0.28)',
    size: 'min(48vw, 460px)',
    left: '58%',
    top: '8%',
    duration: 26,
    delay: 2,
  },
  {
    color: 'rgba(57, 255, 140, 0.22)',
    size: 'min(42vw, 400px)',
    left: '22%',
    top: '52%',
    duration: 24,
    delay: 4,
  },
  {
    color: 'rgba(0, 184, 212, 0.2)',
    size: 'min(50vw, 480px)',
    left: '72%',
    top: '62%',
    duration: 28,
    delay: 1,
  },
];

export default function MeshGradientBackground() {
  return (
    <div className="mesh-gradient-root" aria-hidden="true">
      <div className="mesh-gradient-base" />
      {MESH_BLOBS.map((blob, index) => (
        <motion.div
          key={index}
          className="mesh-gradient-blob"
          style={{
            width: blob.size,
            height: blob.size,
            left: blob.left,
            top: blob.top,
            background: `radial-gradient(circle at 40% 40%, ${blob.color} 0%, transparent 68%)`,
          }}
          animate={{
            x: ['0%', '8%', '-6%', '4%', '0%'],
            y: ['0%', '-10%', '8%', '-4%', '0%'],
            scale: [1, 1.12, 0.92, 1.06, 1],
            rotate: [0, 8, -6, 4, 0],
          }}
          transition={{
            duration: blob.duration,
            delay: blob.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="mesh-gradient-noise" />
      <div className="mesh-gradient-vignette" />
    </div>
  );
}
