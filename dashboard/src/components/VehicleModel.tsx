import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface VehicleModelProps {
  isAnomalyActive: boolean;
  activeAnomalySubsystem: 'Engine' | 'Battery' | 'Brakes' | 'Suspension' | 'Oil system' | null;
}

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.85;
const ZOOM_STEP = 0.12;
const ROTATE_STEP = 0.35;
const ROTATION_SMOOTH = 9;
const ZOOM_SMOOTH = 11;
const HOLD_ROTATE_SPEED = 1.6;
const HOLD_ZOOM_SPEED = 0.55;

type ModelControlKey = 'rotateLeft' | 'rotateRight' | 'rotateUp' | 'rotateDown' | 'zoomIn' | 'zoomOut';

const DEFAULT_ROT_X = -0.06;
const DEFAULT_ROT_Y = 0.48;
const SHOWROOM_FOV = 36;

const WEB_BG = 0x08080c;
const WEB_SURFACE = 0x141414;
const WEB_ACCENT = 0x5ac8fa;

const MODEL_GLB_URL = '/models/CarModel.glb';
const MODEL_TARGET_SIZE = 4.9;
const MIN_EXPECTED_MESHES = 5;
/** Used when Box3 is empty before GPU upload (obj2gltf export bounds). */
const GLB_FALLBACK_BOUNDS = {
  min: new THREE.Vector3(-122.4, -75.2, -264),
  max: new THREE.Vector3(122.5, 82.6, 262),
};

type LoadedModelFormat = 'glb' | 'obj';
type ModelLoadStatus = 'loading' | 'loaded' | 'placeholder' | 'error';
type ModelLoadPhase = 'checking' | 'glb' | 'obj' | 'processing';

const GLB_FETCH_TIMEOUT_MS = 8000;
const GLB_MAGIC = 0x46546c67;

function isValidGlbBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  return new DataView(buffer).getUint32(0, true) === GLB_MAGIC;
}

function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

async function probeGlbAvailable(url: string): Promise<boolean> {
  try {
    const head = await fetchWithTimeout(url, 4000, { method: 'HEAD' });
    if (!head.ok) return false;
    const type = head.headers.get('content-type') ?? '';
    const length = Number(head.headers.get('content-length') || 0);
    return type.includes('gltf') || type.includes('octet-stream') || length > 1024;
  } catch {
    return false;
  }
}

/** Cache GLB bytes; parse a fresh scene per WebGL context after dispose. */
let glbBufferCache: ArrayBuffer | null = null;
let glbBufferPromise: Promise<ArrayBuffer> | null = null;

function getModelGlbUrl() {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}models/CarModel.glb`.replace(/([^:]\/)\/+/g, '$1');
}

function resetGlbBufferCache() {
  glbBufferCache = null;
  glbBufferPromise = null;
}

async function fetchGlbBuffer(onProgress?: (pct: number) => void): Promise<ArrayBuffer> {
  if (glbBufferCache) return glbBufferCache;

  const url = getModelGlbUrl();
  const available = await probeGlbAvailable(url);
  if (!available) {
    throw new Error('GLB not found');
  }

  if (!glbBufferPromise) {
    glbBufferPromise = fetchWithTimeout(url, GLB_FETCH_TIMEOUT_MS)
      .then(async (response) => {
        if (!response.ok) throw new Error(`GLB HTTP ${response.status}`);
        const total = Number(response.headers.get('content-length') || 0);
        if (!response.body || !total) {
          onProgress?.(100);
          const buffer = await response.arrayBuffer();
          if (!isValidGlbBuffer(buffer)) throw new Error('Invalid GLB payload');
          return buffer;
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          onProgress?.((loaded / total) * 100);
        }
        const out = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
          out.set(chunk, offset);
          offset += chunk.length;
        }
        const buffer = out.buffer;
        if (!isValidGlbBuffer(buffer)) throw new Error('Invalid GLB payload');
        return buffer;
      })
      .then((buffer) => {
        glbBufferCache = buffer;
        return buffer;
      })
      .catch((err) => {
        glbBufferPromise = null;
        throw err;
      });
  }
  return glbBufferPromise;
}

function parseGlbBuffer(buffer: ArrayBuffer): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => resolve(gltf.scene),
      reject
    );
  });
}

function countMeshes(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) count += 1;
  });
  return count;
}

function ensureGeometryBounds(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }
  });
}

function computeModelBounds(object: THREE.Object3D): THREE.Box3 {
  ensureGeometryBounds(object);
  object.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(object);
  if (!bbox.isEmpty()) return bbox;
  return new THREE.Box3(GLB_FALLBACK_BOUNDS.min.clone(), GLB_FALLBACK_BOUNDS.max.clone());
}

function fitModelToScene(
  cadModel: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  cameraTarget: THREE.Vector3,
  cameraBaseOffset: THREE.Vector3,
) {
  let bbox = computeModelBounds(cadModel);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  if (size.z > size.x * 1.1) {
    cadModel.rotation.y = Math.PI / 2;
  }

  cadModel.updateMatrixWorld(true);
  bbox = computeModelBounds(cadModel);
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  cadModel.scale.setScalar(MODEL_TARGET_SIZE / maxDim);

  cadModel.updateMatrixWorld(true);
  bbox = computeModelBounds(cadModel);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  cadModel.position.x -= center.x;
  cadModel.position.z -= center.z;
  cadModel.position.y += 0.18 - bbox.min.y;

  bbox = computeModelBounds(cadModel);
  bbox.getCenter(center);
  cameraTarget.set(0, Math.max(center.y * 0.92, 0.78), 0);
  camera.fov = SHOWROOM_FOV;
  camera.position.set(6.4, 1.72, 7.6);
  camera.near = 0.01;
  camera.far = 200;
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
  cameraBaseOffset.copy(camera.position).sub(cameraTarget);
}

type MeshMaterialRole = 'glass' | 'chrome' | 'rubber' | 'body' | 'default';

function classifyMeshRole(name: string): MeshMaterialRole {
  const n = name.toLowerCase();
  if (/glass|window|windscreen|windshield|lamp_lens|light_lens|headlight/.test(n)) return 'glass';
  if (/chrome|trim|badge|logo|mirror|grille|grill|exhaust|rim|wheel_disk|alloy|hub|antenna|handle/.test(n)) {
    return 'chrome';
  }
  if (/tire|tyre|rubber|seal|wiper|mudflap|brake/.test(n)) return 'rubber';
  if (/interior|seat|dashboard|carpet|steering|headliner|fabric/.test(n)) return 'default';
  return 'body';
}

function prepareGlbScene(root: THREE.Object3D, envMap: THREE.Texture | null) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.visible = true;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;

    const role = classifyMeshRole(child.name);
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      const mat = material as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
      if (envMap) mat.envMap = envMap;

      switch (role) {
        case 'glass':
          if (mat.transmission !== undefined) mat.transmission = Math.max(mat.transmission, 0.88);
          mat.roughness = 0.05;
          mat.envMapIntensity = 1.5;
          break;
        case 'chrome':
          mat.metalness = 1;
          mat.roughness = 0.08;
          mat.envMapIntensity = 2.1;
          break;
        case 'body':
          if (mat.clearcoat !== undefined) {
            mat.clearcoat = 1;
            mat.clearcoatRoughness = 0.04;
          }
          mat.metalness = Math.max(mat.metalness ?? 0, 0.55);
          mat.roughness = Math.min(mat.roughness ?? 1, 0.2);
          mat.envMapIntensity = 1.4;
          break;
        default:
          mat.envMapIntensity = 1.05;
      }
      mat.needsUpdate = true;
    });
  });
}

function applyGlbXray(mesh: THREE.Mesh, isXray: boolean) {
  const name = mesh.name.toLowerCase();
  const isGlass = name.includes('glass') || name.includes('windscreen') || name.includes('window');
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    const mat = material as THREE.MeshStandardMaterial & { userData: Record<string, unknown> };
    if (!mat.userData.glbSaved) {
      mat.userData.glbSaved = {
        transparent: mat.transparent,
        opacity: mat.opacity,
        depthWrite: mat.depthWrite,
      };
    }
    const saved = mat.userData.glbSaved as { transparent: boolean; opacity: number; depthWrite: boolean };
    if (isXray && !isGlass) {
      mat.transparent = true;
      mat.opacity = 0.35;
      mat.depthWrite = false;
    } else {
      mat.transparent = saved.transparent;
      mat.opacity = saved.opacity;
      mat.depthWrite = saved.depthWrite;
    }
    mat.needsUpdate = true;
  });
}

const styleImportedMesh = (mesh: THREE.Mesh, isXray: boolean) => {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const styledMaterials = materials.map((sourceMaterial) => sourceMaterial.clone());
  const name = mesh.name.toLowerCase();
  const isGlass = name.includes('glass') || name.includes('windscreen') || name.includes('window');

  styledMaterials.forEach((material) => {
    const mat = material as any;
    mat.side = THREE.DoubleSide;

    if (isXray && !isGlass) {
      mat.transparent = true;
      mat.opacity = 0.32;
      mat.depthWrite = false;
      if (mat.color) mat.color.setHex(0x5ac8fa);
      if (mat.emissive) {
        mat.emissive.setHex(0x102c3a);
        mat.emissiveIntensity = 0.35;
      }
    } else if (!isGlass) {
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      if (mat.color) mat.color.setHex(0xe8ecf0);
      if (mat.roughness !== undefined) mat.roughness = 0.16;
      if (mat.metalness !== undefined) mat.metalness = 0.62;
      if (mat.clearcoat !== undefined) mat.clearcoat = 1;
      if (mat.clearcoatRoughness !== undefined) mat.clearcoatRoughness = 0.03;
      if (mat.emissive) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
      if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 1.5;
    } else {
      mat.transparent = true;
      mat.opacity = 0.45;
      mat.depthWrite = false;
      if (mat.color) mat.color.setHex(0x7dd7ff);
    }

    mat.needsUpdate = true;
  });

  mesh.material = Array.isArray(mesh.material) ? styledMaterials : styledMaterials[0];
  mesh.visible = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
};

/** Light OBJ styling without cloning every material (large fallback meshes). */
function applyLightObjStyle(mesh: THREE.Mesh, envMap: THREE.Texture | null) {
  mesh.visible = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    if (!material) return;
    const mat = material as THREE.MeshStandardMaterial;
    mat.side = THREE.FrontSide;
    if (envMap) mat.envMap = envMap;
    if (mat.envMapIntensity !== undefined) mat.envMapIntensity = 1.25;
    if (mat.roughness !== undefined && mat.roughness > 0.5) mat.roughness = 0.35;
    if (mat.metalness !== undefined && mat.metalness < 0.3) mat.metalness = 0.55;
    mat.needsUpdate = true;
  });
}

const createShowroomBackdrop = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#121820');
  gradient.addColorStop(0.35, '#0a0a10');
  gradient.addColorStop(0.65, '#08080c');
  gradient.addColorStop(1, '#060608');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createTurntableFloorTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(256, 256, 8, 256, 256, 268);
  gradient.addColorStop(0, 'rgba(90,200,250,0.12)');
  gradient.addColorStop(0.25, 'rgba(20,20,20,0.65)');
  gradient.addColorStop(0.55, 'rgba(14,14,18,0.95)');
  gradient.addColorStop(1, 'rgba(6,6,8,1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(90,200,250,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(256, 256, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 256, 180, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export default function VehicleModel({ isAnomalyActive, activeAnomalySubsystem }: VehicleModelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [xrayView, setXrayView] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [modelState, setModelState] = useState<{
    status: ModelLoadStatus;
    progress: number;
    phase: ModelLoadPhase;
  }>({
    status: 'placeholder',
    progress: 0,
    phase: 'checking',
  });
  const [sceneKey, setSceneKey] = useState(0);
  const [activeControls, setActiveControls] = useState<Set<ModelControlKey>>(new Set());
  const autoRotateRef = useRef<boolean>(true);
  const resetTriggerRef = useRef<(() => void) | null>(null);
  const zoomInTriggerRef = useRef<(() => void) | null>(null);
  const zoomOutTriggerRef = useRef<(() => void) | null>(null);
  const rotateLeftTriggerRef = useRef<(() => void) | null>(null);
  const rotateRightTriggerRef = useRef<(() => void) | null>(null);
  const rotateUpTriggerRef = useRef<(() => void) | null>(null);
  const rotateDownTriggerRef = useRef<(() => void) | null>(null);
  const controlStateRef = useRef<Record<ModelControlKey, boolean>>({
    rotateLeft: false,
    rotateRight: false,
    rotateUp: false,
    rotateDown: false,
    zoomIn: false,
    zoomOut: false,
  });
  const tiresRef = useRef<THREE.Mesh[]>([]);
  const loadedModelRef = useRef<THREE.Object3D | null>(null);
  const loadedModelFormatRef = useRef<LoadedModelFormat | null>(null);
  const mountIdRef = useRef(0);
  const activeAnomalySubsystemRef = useRef(activeAnomalySubsystem);
  const isAnomalyActiveRef = useRef(isAnomalyActive);

  const subsystemMeshes = useRef<Record<string, THREE.Mesh | THREE.Group>>({});

  useEffect(() => {
    activeAnomalySubsystemRef.current = activeAnomalySubsystem;
  }, [activeAnomalySubsystem]);

  useEffect(() => {
    isAnomalyActiveRef.current = isAnomalyActive;
  }, [isAnomalyActive]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const retryModelLoad = () => {
    resetGlbBufferCache();
    setModelState({ status: 'loading', progress: 0, phase: 'checking' });
    setSceneKey((k) => k + 1);
  };

  const releaseAllControls = () => {
    (Object.keys(controlStateRef.current) as ModelControlKey[]).forEach((key) => {
      controlStateRef.current[key] = false;
    });
    setActiveControls(new Set());
  };

  const setControlHeld = (key: ModelControlKey, held: boolean) => {
    controlStateRef.current[key] = held;
    setActiveControls((prev) => {
      const next = new Set(prev);
      if (held) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setControlHeld('rotateLeft', true);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setControlHeld('rotateRight', true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setControlHeld('rotateUp', true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setControlHeld('rotateDown', true);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setControlHeld('zoomIn', true);
          break;
        case '-':
        case '_':
          e.preventDefault();
          setControlHeld('zoomOut', true);
          break;
        case 'r':
        case 'R':
          resetTriggerRef.current?.();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          setControlHeld('rotateLeft', false);
          break;
        case 'ArrowRight':
          setControlHeld('rotateRight', false);
          break;
        case 'ArrowUp':
          setControlHeld('rotateUp', false);
          break;
        case 'ArrowDown':
          setControlHeld('rotateDown', false);
          break;
        case '+':
        case '=':
          setControlHeld('zoomIn', false);
          break;
        case '-':
        case '_':
          setControlHeld('zoomOut', false);
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', releaseAllControls);
    window.addEventListener('touchend', releaseAllControls);
    window.addEventListener('blur', releaseAllControls);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', releaseAllControls);
      window.removeEventListener('touchend', releaseAllControls);
      window.removeEventListener('blur', releaseAllControls);
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const mountId = ++mountIdRef.current;
    setModelState({ status: 'loading', progress: 0, phase: 'checking' });

    tiresRef.current = [];
    subsystemMeshes.current = {};

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const showroomBackdrop = createShowroomBackdrop();
    if (showroomBackdrop) scene.background = showroomBackdrop;
    scene.fog = new THREE.Fog(WEB_BG, 12, 32);

    const camera = new THREE.PerspectiveCamera(SHOWROOM_FOV, width / height, 0.1, 100);
    const cameraTarget = new THREE.Vector3(0, 0.78, 0);
    const defaultCameraPosition = new THREE.Vector3(6.4, 1.72, 7.6);
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(cameraTarget);

    // Zoom scales cameraBaseOffset length so the camera dollies toward/away from the target.
    const cameraBaseOffset = defaultCameraPosition.clone().sub(cameraTarget);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(WEB_BG, 1);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    mountRef.current.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.08).texture;
    scene.environment = environmentTexture;
    pmremGenerator.dispose();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(WEB_ACCENT, WEB_SURFACE, 0.45);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf0f8ff, 1.65);
    keyLight.position.set(9, 13, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 24;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.radius = 2;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(WEB_ACCENT, 0.38);
    fillLight.position.set(-7, 5, 9);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc8e8ff, 1.05);
    rimLight.position.set(-9, 4, -8);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.42);
    topLight.position.set(0, 16, 2);
    scene.add(topLight);

    const groundBounce = new THREE.DirectionalLight(0x8899aa, 0.18);
    groundBounce.position.set(0, -4, 4);
    scene.add(groundBounce);

    const carGroup = new THREE.Group();
    scene.add(carGroup);
    const placeholderObjects: THREE.Object3D[] = [];

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f1f1f,
      roughness: 0.35,
      metalness: 0.85,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.1,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x5AC8FA,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      transparent: true,
      opacity: 0.35,
    });

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.7,
      metalness: 0.3
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.65,
    });

    const chassisGeo = new THREE.BoxGeometry(3.6, 0.25, 1.5);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.2;
    chassis.receiveShadow = true;
    chassis.castShadow = true;
    carGroup.add(chassis);
    placeholderObjects.push(chassis);

    const cabinGeo = new THREE.BoxGeometry(1.6, 0.5, 1.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.2, 0.65, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);
    placeholderObjects.push(cabin);

    const noseGeo = new THREE.BoxGeometry(1.0, 0.35, 1.48);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(1.5, 0.35, 0);
    nose.castShadow = true;
    carGroup.add(nose);
    placeholderObjects.push(nose);

    const trunkGeo = new THREE.BoxGeometry(0.8, 0.45, 1.48);
    const trunk = new THREE.Mesh(trunkGeo, bodyMat);
    trunk.position.set(-1.4, 0.4, 0);
    trunk.castShadow = true;
    carGroup.add(trunk);
    placeholderObjects.push(trunk);

    const batteryGeo = new THREE.BoxGeometry(2.0, 0.15, 1.2);
    const batteryMatDefault = new THREE.MeshStandardMaterial({
      color: 0x30D158,
      roughness: 0.5,
      metalness: 0.7,
      emissive: 0x30D158,
      emissiveIntensity: 0.15
    });
    const battery = new THREE.Mesh(batteryGeo, batteryMatDefault);
    battery.position.set(-0.1, 0.1, 0);
    carGroup.add(battery);
    placeholderObjects.push(battery);
    subsystemMeshes.current['Battery'] = battery;

    const motorGroup = new THREE.Group();
    motorGroup.position.set(1.4, 0.3, 0);
    const motorBlockGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const motorMatDefault = new THREE.MeshStandardMaterial({
      color: 0x5AC8FA,
      roughness: 0.4,
      metalness: 0.8,
      emissive: 0x5AC8FA,
      emissiveIntensity: 0.1
    });
    const motorMesh = new THREE.Mesh(motorBlockGeo, motorMatDefault);
    motorGroup.add(motorMesh);
    carGroup.add(motorGroup);
    placeholderObjects.push(motorGroup);
    subsystemMeshes.current['Engine'] = motorMesh;

    const oilGroup = new THREE.Group();
    oilGroup.position.set(1.4, 0.45, 0.3);
    const oilTankGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16);
    const oilMatDefault = new THREE.MeshStandardMaterial({
      color: 0xFFB020,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0xFFB020,
      emissiveIntensity: 0.1
    });
    const oilMesh = new THREE.Mesh(oilTankGeo, oilMatDefault);
    oilMesh.rotation.x = Math.PI / 2;
    oilGroup.add(oilMesh);
    carGroup.add(oilGroup);
    placeholderObjects.push(oilGroup);
    subsystemMeshes.current['Oil system'] = oilMesh;

    const suspensionGroup = new THREE.Group();
    const strutMatDefault = new THREE.MeshStandardMaterial({
      color: 0x8E8E93,
      roughness: 0.3,
      metalness: 0.9,
    });

    const strutCoords = [
      { x: 1.1, z: 0.72 }, { x: 1.1, z: -0.72 },
      { x: -1.1, z: 0.72 }, { x: -1.1, z: -0.72 }
    ];

    strutCoords.forEach((coord) => {
      const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
      const strut = new THREE.Mesh(strutGeo, strutMatDefault);
      strut.position.set(coord.x, 0.25, coord.z);
      suspensionGroup.add(strut);
    });
    carGroup.add(suspensionGroup);
    placeholderObjects.push(suspensionGroup);
    subsystemMeshes.current['Suspension'] = suspensionGroup;

    const wheelPositions = [
      { x: 1.1, y: 0.15, z: 0.76 },
      { x: 1.1, y: 0.15, z: -0.76 },
      { x: -1.1, y: 0.15, z: 0.76 },
      { x: -1.1, y: 0.15, z: -0.76 },
    ];

    const brakeGroup = new THREE.Group();
    const brakeMatDefault = new THREE.MeshStandardMaterial({
      color: 0xAEAEB2,
      roughness: 0.2,
      metalness: 0.9,
    });

    wheelPositions.forEach((pos) => {
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24);
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(pos.x, pos.y, pos.z);
      tire.castShadow = true;
      carGroup.add(tire);
      tiresRef.current.push(tire);
      placeholderObjects.push(tire);

      const brakeGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16);
      const brakeDisc = new THREE.Mesh(brakeGeo, brakeMatDefault);
      brakeDisc.rotation.x = Math.PI / 2;
      brakeDisc.position.set(pos.x, pos.y, pos.z * 0.88);
      brakeGroup.add(brakeDisc);
    });

    carGroup.add(brakeGroup);
    placeholderObjects.push(brakeGroup);
    subsystemMeshes.current['Brakes'] = brakeGroup;

    const turntableTexture = createTurntableFloorTexture();

    const cycloramaGeo = new THREE.PlaneGeometry(22, 10);
    const cycloramaMat = new THREE.MeshStandardMaterial({
      color: WEB_SURFACE,
      roughness: 0.95,
      metalness: 0,
    });
    const cyclorama = new THREE.Mesh(cycloramaGeo, cycloramaMat);
    cyclorama.position.set(0, 3.2, -7.5);
    cyclorama.receiveShadow = true;
    scene.add(cyclorama);

    const turntableGeo = new THREE.CircleGeometry(7.2, 96);
    const turntableMat = new THREE.MeshPhysicalMaterial({
      map: turntableTexture ?? undefined,
      color: WEB_SURFACE,
      roughness: 0.32,
      metalness: 0.65,
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.05,
    });
    const turntable = new THREE.Mesh(turntableGeo, turntableMat);
    turntable.rotation.x = -Math.PI / 2;
    turntable.position.y = -0.24;
    turntable.receiveShadow = true;
    scene.add(turntable);

    const floorGeo = new THREE.PlaneGeometry(26, 26);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.RingGeometry(2.35, 2.42, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: WEB_ACCENT,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = -0.215;
    scene.add(groundRing);

    const outerRingGeo = new THREE.RingGeometry(2.48, 2.54, 96);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: WEB_ACCENT,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const outerGroundRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerGroundRing.rotation.x = -Math.PI / 2;
    outerGroundRing.position.y = -0.214;
    scene.add(outerGroundRing);

    const normalizedBaseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const objDir = `${normalizedBaseUrl}models/CarModel/`;

    let disposed = false;

    const reportProgress = (pct: number, phase?: ModelLoadPhase) => {
      if (!disposed && mountId === mountIdRef.current) {
        setModelState((prev) =>
          prev.status === 'loading' || prev.status === 'placeholder'
            ? {
                ...prev,
                progress: Math.min(100, Math.round(pct)),
                phase: phase ?? prev.phase,
              }
            : prev
        );
      }
    };

    const safeSetModelState = (next: {
      status: ModelLoadStatus;
      progress: number;
      phase?: ModelLoadPhase;
    }) => {
      if (!disposed && mountId === mountIdRef.current) {
        setModelState((prev) => ({
          ...prev,
          ...next,
          phase: next.phase ?? prev.phase,
        }));
      }
    };

    const showPlaceholderPreview = () => {
      placeholderObjects.forEach((object) => {
        object.visible = true;
      });
    };

    showPlaceholderPreview();
    safeSetModelState({ status: 'placeholder', progress: 0, phase: 'checking' });

    const finalizeLoadedModel = (cadModel: THREE.Object3D, format: LoadedModelFormat) => {
      if (mountId !== mountIdRef.current || disposed) return;

      const meshCount = countMeshes(cadModel);
      if (meshCount < MIN_EXPECTED_MESHES) {
        console.warn('[VehicleModel] Loaded model has too few meshes:', meshCount);
        showPlaceholderPreview();
        safeSetModelState({ status: 'placeholder', progress: 0, phase: 'checking' });
        return;
      }

      reportProgress(96, 'processing');

      cadModel.name = 'LoadedCarModel';
      fitModelToScene(cadModel, camera, cameraTarget, cameraBaseOffset);

      placeholderObjects.forEach((object) => {
        object.visible = false;
      });

      if (loadedModelRef.current) {
        try {
          carGroup.remove(loadedModelRef.current);
        } catch {
          /* ignore */
        }
        loadedModelRef.current = null;
      }

      carGroup.add(cadModel);
      loadedModelRef.current = cadModel;
      loadedModelFormatRef.current = format;

      targetRotationX = DEFAULT_ROT_X;
      targetRotationY = DEFAULT_ROT_Y;
      currentRotationX = targetRotationX;
      currentRotationY = targetRotationY;

      safeSetModelState({ status: 'loaded', progress: 100, phase: 'processing' });

      if (format === 'glb') {
        prepareGlbScene(cadModel, environmentTexture);
        if (xrayView) {
          cadModel.traverse((child) => {
            if (child instanceof THREE.Mesh) applyGlbXray(child, true);
          });
        }
      } else {
        cadModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            try {
              applyLightObjStyle(child, environmentTexture);
            } catch {
              /* ignore malformed submesh materials */
            }
          }
        });
      }
    };

    const loadObjModel = (): Promise<THREE.Object3D | null> =>
      new Promise((resolve) => {
        reportProgress(0, 'obj');
        const objLoader = new OBJLoader();
        objLoader.setPath(objDir);

        const onObjError = () => resolve(null);

        const loadObjFile = (materials?: MTLLoader.MaterialCreator) => {
          if (materials) {
            materials.preload();
            objLoader.setMaterials(materials);
          }
          objLoader.load(
            'CarModel.obj',
            (object) => {
              reportProgress(94, 'processing');
              resolve(object);
            },
            (xhr) => {
              if (xhr.total) reportProgress((xhr.loaded / xhr.total) * 92, 'obj');
              else reportProgress(40, 'obj');
            },
            onObjError
          );
        };

        const mtlLoader = new MTLLoader();
        mtlLoader.setResourcePath(objDir);
        mtlLoader.setPath(objDir);
        mtlLoader.load('CarModel.mtl', loadObjFile, undefined, () => loadObjFile());
      });

    const loadGlbModel = async (): Promise<THREE.Object3D | null> => {
      try {
        reportProgress(0, 'checking');
        reportProgress(2, 'glb');
        const buffer = await fetchGlbBuffer((pct) => reportProgress(5 + pct * 0.85, 'glb'));
        reportProgress(92, 'glb');
        const scene = await parseGlbBuffer(buffer);
        reportProgress(95, 'processing');
        return scene;
      } catch (err) {
        console.warn('[VehicleModel] GLB load failed:', err);
        return null;
      }
    };

    const loadVehicleModel = async (): Promise<{ model: THREE.Object3D; format: LoadedModelFormat } | null> => {
      const glb = await loadGlbModel();
      if (glb) return { model: glb, format: 'glb' };
      console.warn('[VehicleModel] GLB missing — falling back to OBJ (~106 MB, first load may take minutes)');
      reportProgress(0, 'obj');
      const obj = await loadObjModel();
      if (obj) return { model: obj, format: 'obj' };
      return null;
    };

    loadVehicleModel().then((result) => {
      if (disposed || mountId !== mountIdRef.current) return;
      if (!result) {
        showPlaceholderPreview();
        safeSetModelState({ status: 'placeholder', progress: 0, phase: 'checking' });
        return;
      }
      requestAnimationFrame(() => finalizeLoadedModel(result.model, result.format));
    });

    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let pinchStartDistance: number | null = null;

    // targetRotationX/Y accumulates via delta-time (drag + idle spin) to avoid jumps on mouse release.
    let targetRotationX = -0.12;
    let targetRotationY = 0.72;
    let currentRotationX = -0.12;
    let currentRotationY = 0.72;

    let targetZoom = 1;
    let currentZoom = 1;

    const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

    resetTriggerRef.current = () => {
      targetRotationX = DEFAULT_ROT_X;
      targetRotationY = DEFAULT_ROT_Y;
      targetZoom = 1;
    };

    zoomInTriggerRef.current = () => {
      targetZoom = clampZoom(targetZoom - ZOOM_STEP);
    };

    zoomOutTriggerRef.current = () => {
      targetZoom = clampZoom(targetZoom + ZOOM_STEP);
    };

    rotateLeftTriggerRef.current = () => {
      targetRotationY += ROTATE_STEP;
    };

    rotateRightTriggerRef.current = () => {
      targetRotationY -= ROTATE_STEP;
    };

    rotateUpTriggerRef.current = () => {
      targetRotationX = Math.max(-0.5, targetRotationX - ROTATE_STEP * 0.55);
    };

    rotateDownTriggerRef.current = () => {
      targetRotationX = Math.min(0.5, targetRotationX + ROTATE_STEP * 0.55);
    };

    const onPointerDown = (x: number, y: number) => {
      isDragging = true;
      previousPointerPosition = { x, y };
    };

    const onPointerMove = (x: number, y: number, sensitivity: number) => {
      if (!isDragging) return;
      const deltaX = x - previousPointerPosition.x;
      const deltaY = y - previousPointerPosition.y;

      targetRotationY += deltaX * sensitivity;
      targetRotationX = Math.max(-0.5, Math.min(0.5, targetRotationX + deltaY * sensitivity));

      previousPointerPosition = { x, y };
    };

    const onPointerUp = () => {
      isDragging = false;
      pinchStartDistance = null;
    };

    const onMouseDown = (e: MouseEvent) => onPointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY, 0.0055);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDistance = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistance !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const delta = distance - pinchStartDistance;
        targetZoom = clampZoom(targetZoom - delta * 0.004);
        pinchStartDistance = distance;
        return;
      }
      if (e.touches.length === 1) {
        if (isDragging) e.preventDefault();
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY, 0.0065);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom = clampZoom(targetZoom + e.deltaY * 0.0008);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    domEl.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    let animationFrameId: number;
    const timer = new THREE.Timer();
    timer.connect(document);
    const AUTO_ROTATE_SPEED = 0.055;
    const IDLE_PITCH_SPEED = 0.35;
    let idlePitchPhase = 0;

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);

      const delta = Math.min(timer.getDelta(), 0.05);
      const controls = controlStateRef.current;

      if (controls.rotateLeft) targetRotationY += delta * HOLD_ROTATE_SPEED;
      if (controls.rotateRight) targetRotationY -= delta * HOLD_ROTATE_SPEED;
      if (controls.rotateUp) {
        targetRotationX = Math.max(-0.5, targetRotationX - delta * HOLD_ROTATE_SPEED * 0.55);
      }
      if (controls.rotateDown) {
        targetRotationX = Math.min(0.5, targetRotationX + delta * HOLD_ROTATE_SPEED * 0.55);
      }
      if (controls.zoomIn) targetZoom = clampZoom(targetZoom - delta * HOLD_ZOOM_SPEED);
      if (controls.zoomOut) targetZoom = clampZoom(targetZoom + delta * HOLD_ZOOM_SPEED);

      if (!isDragging && autoRotateRef.current && !controls.rotateLeft && !controls.rotateRight) {
        targetRotationY += delta * AUTO_ROTATE_SPEED;
        idlePitchPhase += delta * IDLE_PITCH_SPEED;
      }

      const rotLerp = 1 - Math.exp(-ROTATION_SMOOTH * delta);
      const zoomLerp = 1 - Math.exp(-ZOOM_SMOOTH * delta);
      currentRotationX += (targetRotationX - currentRotationX) * rotLerp;
      currentRotationY += (targetRotationY - currentRotationY) * rotLerp;

      const idlePitch = !isDragging && autoRotateRef.current ? Math.sin(idlePitchPhase) * 0.008 : 0;
      carGroup.rotation.x = currentRotationX + idlePitch;
      carGroup.rotation.y = currentRotationY;

      currentZoom += (targetZoom - currentZoom) * zoomLerp;
      camera.position.copy(cameraTarget).add(
        cameraBaseOffset.clone().multiplyScalar(currentZoom)
      );
      camera.lookAt(cameraTarget);

      const elapsed = timer.getElapsed();
      const hasAnomaly = isAnomalyActiveRef.current;
      const calmPulse = 0.5 + Math.sin(elapsed * 1.6) * 0.5;

      if (hasAnomaly) {
        const softPulse = 0.5 + Math.sin(elapsed * 2.5) * 0.5;
        ringMat.color.setHex(0xff6b5a);
        ringMat.opacity = 0.12 + softPulse * 0.04;
        outerRingMat.color.setHex(0xff6b5a);
        outerRingMat.opacity = 0.05 + softPulse * 0.02;
      } else {
        ringMat.color.setHex(WEB_ACCENT);
        ringMat.opacity = 0.08 + calmPulse * 0.04;
        outerRingMat.color.setHex(WEB_ACCENT);
        outerRingMat.opacity = 0.03 + calmPulse * 0.02;
      }

      carGroup.position.y = 0;

      keyLight.color.setHex(hasAnomaly ? 0xffece8 : 0xf0f8ff);
      keyLight.intensity = hasAnomaly ? 1.45 : 1.65;
      fillLight.intensity = hasAnomaly ? 0.28 : 0.38;
      rimLight.intensity = hasAnomaly ? 0.85 : 1.05;
      scene.fog!.color.setHex(hasAnomaly ? 0x180808 : WEB_BG);

      const applyAnomalyMaterial = (
        mesh: THREE.Mesh,
        isAnomalous: boolean,
        storageKey: 'originalColor' | 'glbAnomalySaved'
      ) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          const mat = material as THREE.MeshStandardMaterial;
          if (!mat?.color) return;

          if (!mesh.userData[storageKey]) {
            mesh.userData[storageKey] = {
              color: mat.color.clone(),
              emissive: mat.emissive?.clone() || new THREE.Color(0, 0, 0),
              emissiveIntensity: mat.emissiveIntensity || 0,
            };
          }

          const saved = mesh.userData[storageKey] as {
            color: THREE.Color;
            emissive: THREE.Color;
            emissiveIntensity: number;
          };

          if (isAnomalous) {
            const pulseIntensity = 0.12 + Math.abs(Math.sin(elapsed * 3)) * 0.18;
            mat.color.setHex(0xc85a50);
            if (mat.emissive) {
              mat.emissive.setHex(0x8a3028);
              mat.emissiveIntensity = pulseIntensity;
            }
          } else {
            mat.color.copy(saved.color);
            if (mat.emissive) {
              mat.emissive.copy(saved.emissive);
              mat.emissiveIntensity = saved.emissiveIntensity;
            }
          }
          mat.needsUpdate = true;
        });
      };

      Object.entries(subsystemMeshes.current).forEach(([name, mesh]) => {
        const subsystem = activeAnomalySubsystemRef.current;
        const isAnomalous = hasAnomaly && (subsystem === null || subsystem === name);
        (mesh as THREE.Object3D).traverse((child) => {
          if (child instanceof THREE.Mesh) applyAnomalyMaterial(child, isAnomalous, 'originalColor');
        });
      });

      if (loadedModelRef.current) {
        loadedModelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) applyAnomalyMaterial(child, hasAnomaly, 'glbAnomalySaved');
        });
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      try {
        if (loadedModelRef.current && carGroup) {
          carGroup.remove(loadedModelRef.current);
          loadedModelRef.current = null;
          loadedModelFormatRef.current = null;
        }
      } catch {
        /* ignore */
      }

      showroomBackdrop?.dispose();
      turntableTexture?.dispose();
      turntableMat.dispose();
      cycloramaMat.dispose();
      environmentTexture.dispose();
      renderer.dispose();
    };
  }, [sceneKey]);

  useEffect(() => {
    if (!loadedModelRef.current) return;
    const format = loadedModelFormatRef.current;
    loadedModelRef.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (format === 'glb') applyGlbXray(child, xrayView);
      else styleImportedMesh(child, xrayView);
    });
  }, [xrayView]);

  const bindHoldControl = (key: ModelControlKey, onTap?: () => void) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      setControlHeld(key, true);
      onTap?.();
    },
    onMouseUp: () => setControlHeld(key, false),
    onMouseLeave: () => setControlHeld(key, false),
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      setControlHeld(key, true);
      onTap?.();
    },
    onTouchEnd: () => setControlHeld(key, false),
    onTouchCancel: () => setControlHeld(key, false),
  });

  const controlBtnClass = (key?: ModelControlKey) =>
    `flex items-center justify-center w-7 h-7 text-white hover:bg-white/[0.08] active:scale-95 transition-all duration-150 cursor-pointer select-none rounded-md ${
      key && activeControls.has(key) ? 'bg-[#5AC8FA]/25 ring-1 ring-[#5AC8FA]/50' : 'active:bg-[#5AC8FA]/20'
    }`;

  const isAnomaly = isAnomalyActive;

  const loadPhaseLabel: Record<ModelLoadPhase, string> = {
    checking: 'Checking model file',
    glb: 'Loading optimized model',
    obj: 'Downloading detailed model (large file)',
    processing: 'Preparing 3D scene',
  };

  const isModelLoading =
    modelState.status !== 'loaded' && modelState.status !== 'error' && modelState.progress < 100;

  return (
    <div
      className={`relative w-full h-full flex-1 min-h-[260px] rounded-2xl overflow-hidden transition-colors duration-500 bg-gradient-to-b from-[#0a0a10] via-[#08080c] to-[#060608] ${
        isAnomaly ? 'border border-[#FF453A]/25' : 'border border-white/10'
      }`}
    >
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,6,8,0.72)_100%)]" />

      <div
        ref={mountRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing select-none touch-none"
      />

      {isModelLoading && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-3 py-2 rounded-full bg-black/55 border border-white/10 backdrop-blur-sm">
          <Loader2 className="w-4 h-4 text-[#5AC8FA] animate-spin shrink-0" />
          <span className="text-[10px] text-white/80 tracking-wide whitespace-nowrap">
            {loadPhaseLabel[modelState.phase]}
            {modelState.progress > 0 ? ` · ${modelState.progress}%` : '…'}
          </span>
        </div>
      )}

      {modelState.status === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0d0d0d]/80 backdrop-blur-[2px]">
          <AlertTriangle className="w-6 h-6 text-[#FFB020] mb-2" />
          <span className="text-[10px] text-[#9CA3AF] tracking-widest uppercase text-center px-4">
            Failed to load 3D model
          </span>
          <button
            type="button"
            onClick={retryModelLoad}
            className="mt-3 text-[10px] uppercase tracking-wider text-white bg-[#5AC8FA]/20 hover:bg-[#5AC8FA]/30 border border-[#5AC8FA]/40 px-3 py-1.5 rounded-lg cursor-pointer pointer-events-auto transition-colors"
          >
            Retry load
          </button>
        </div>
      )}

      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex justify-between items-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {modelState.status === 'placeholder' && (
            <span className="text-[9px] uppercase tracking-wider text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 px-2 py-0.5 rounded-full">
              Preview mesh
            </span>
          )}
          {modelState.status === 'error' && (
            <span className="text-[9px] uppercase tracking-wider text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 px-2 py-0.5 rounded-full">
              Load failed
            </span>
          )}
          {isAnomaly ? (
            <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#FF453A]/90 bg-[#FF453A]/8 border border-[#FF453A]/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A]/80" />
              Anomaly
            </span>
          ) : (
            modelState.status === 'loaded' && (
              <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#30D158]/90 bg-[#30D158]/8 border border-[#30D158]/20 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Nominal
              </span>
            )
          )}
        </div>

        {isAnomaly && (
          <div className="bg-[#FF453A]/8 border border-[#FF453A]/20 px-2.5 py-1.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-[#FF453A]/90 text-[10px] uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3" />
              Warning
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => setXrayView(!xrayView)}
          className={`flex items-center gap-1.5 bg-[#141414]/95 backdrop-blur-sm hover:bg-white/[0.06] border text-[10px] tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
            xrayView ? 'border-[#5AC8FA] text-[#5AC8FA]' : 'border-white/10 text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#5AC8FA]" />
          {xrayView ? 'X-RAY' : 'SOLID'}
        </button>
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`flex items-center gap-1.5 bg-[#141414]/95 backdrop-blur-sm hover:bg-white/[0.06] border text-[10px] tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
            autoRotate ? 'border-[#5AC8FA] text-[#5AC8FA]' : 'border-white/10 text-white'
          }`}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#5AC8FA]" /> : <Play className="w-3.5 h-3.5 text-[#5AC8FA]" />}
          {autoRotate ? 'Turntable' : 'Manual'}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex items-end gap-2 pointer-events-auto">
        <div className="bg-[#141414]/95 backdrop-blur-sm border border-white/10 rounded-xl p-1 grid grid-cols-3 gap-px">
          <div className="w-7 h-7" />
          <button
            aria-label="Rotate up"
            className={controlBtnClass('rotateUp')}
            {...bindHoldControl('rotateUp', () => rotateUpTriggerRef.current?.())}
          >
            <ChevronUp className="w-4 h-4 text-[#5AC8FA]" />
          </button>
          <div className="w-7 h-7" />
          <button
            aria-label="Rotate left"
            className={controlBtnClass('rotateLeft')}
            {...bindHoldControl('rotateLeft', () => rotateLeftTriggerRef.current?.())}
          >
            <ChevronLeft className="w-4 h-4 text-[#5AC8FA]" />
          </button>
          <button
            onClick={() => resetTriggerRef.current?.()}
            aria-label="Reset view"
            title="Reset view (R)"
            className="flex items-center justify-center w-7 h-7 text-white hover:bg-white/[0.08] active:scale-95 transition-all duration-150 cursor-pointer rounded-md"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#5AC8FA]" />
          </button>
          <button
            aria-label="Rotate right"
            className={controlBtnClass('rotateRight')}
            {...bindHoldControl('rotateRight', () => rotateRightTriggerRef.current?.())}
          >
            <ChevronRight className="w-4 h-4 text-[#5AC8FA]" />
          </button>
          <div className="w-7 h-7" />
          <button
            aria-label="Rotate down"
            className={controlBtnClass('rotateDown')}
            {...bindHoldControl('rotateDown', () => rotateDownTriggerRef.current?.())}
          >
            <ChevronDown className="w-4 h-4 text-[#5AC8FA]" />
          </button>
          <div className="w-7 h-7" />
        </div>

        <div className="flex flex-col bg-[#141414]/95 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <button
            aria-label="Zoom in"
            className={controlBtnClass('zoomIn')}
            {...bindHoldControl('zoomIn', () => zoomInTriggerRef.current?.())}
          >
            <Plus className="w-3.5 h-3.5 text-[#5AC8FA]" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            aria-label="Zoom out"
            className={controlBtnClass('zoomOut')}
            {...bindHoldControl('zoomOut', () => zoomOutTriggerRef.current?.())}
          >
            <Minus className="w-3.5 h-3.5 text-[#5AC8FA]" />
          </button>
        </div>
      </div>
    </div>
  );
}