import { motion } from 'motion/react';

const MESH_BLOBS = [
  {
    color: 'rgba(90, 200, 250, 0.45)',
    size: 'min(55vw, 520px)',
    left: '-8%',
    top: '-12%',
    duration: 22,
    delay: 0,
  },
  {
    color: 'rgba(42, 157, 143, 0.38)',
    size: 'min(48vw, 460px)',
    left: '58%',
    top: '8%',
    duration: 26,
    delay: 2,
  },
  {
    color: 'rgba(99, 102, 241, 0.32)',
    size: 'min(42vw, 400px)',
    left: '22%',
    top: '52%',
    duration: 24,
    delay: 4,
  },
  {
    color: 'rgba(14, 165, 233, 0.28)',
    size: 'min(50vw, 480px)',
    left: '72%',
    top: '62%',
    duration: 28,
    delay: 1,
  },
  {
    color: 'rgba(48, 209, 88, 0.18)',
    size: 'min(36vw, 340px)',
    left: '5%',
    top: '68%',
    duration: 20,
    delay: 3,
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
