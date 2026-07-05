import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '..');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR
  ? path.resolve(process.env.ARTIFACTS_DIR)
  : path.join(PROJECT_ROOT, 'artifacts');
const DIST_DIR = path.join(__dirname, 'dist');
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const INFERENCE_SCRIPT = path.join(PROJECT_ROOT, 'src', 'inference', 'run_inference.py');
const EDA_SUMMARY_PATH = path.join(ARTIFACTS_DIR, 'eda_summary.json');
const MODEL_SUMMARY_PATH = path.join(ARTIFACTS_DIR, 'model_summary.json');

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
const sessionsDir = path.join(__dirname, 'sessions');
for (const dir of [uploadDir, sessionsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `telemetry-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (/\.csv$/i.test(path.extname(file.originalname))) return cb(null, true);
    cb(new Error('Only CSV files are allowed.'));
  },
});

interface InferencePrediction {
  rowIndex: number;
  timestamp: string;
  Engine_RPM: number;
  Vehicle_Speed: number;
  Coolant_Temp: number;
  Oil_Pressure: number;
  Vibration_Z: number;
  Engine_Load: number;
  Battery_Voltage: number;
  Throttle_Position: number;
  Brake_Pressure: number;
  Fuel_Rate: number;
  Intake_Air_Temp: number;
  Ambient_Temp: number;
  Acceleration_X: number;
  Acceleration_Y: number;
  isolationForestScore: number;
  lstmScore: number;
  fusionScore: number;
  isAnomaly: boolean;
  confidence: number;
  anomalySubsystem: string;
  anomalyReason: string;
  groundTruthAnomaly?: boolean;
}

interface InferenceResult {
  totalProcessedRows: number;
  anomalyRows: number;
  anomalyPercentage: number;
  bestThreshold: number;
  subsystemFaults: Record<string, number>;
  predictions: InferencePrediction[];
}

interface StreamSession {
  id: string;
  fileName: string;
  predictions: InferencePrediction[];
  bestThreshold: number;
  cursor: number;
  playing: boolean;
  intervalMs: number;
  timer: ReturnType<typeof setInterval> | null;
  clients: Set<express.Response>;
}

const streamSessions = new Map<string, StreamSession>();

function runPythonInference(csvPath: string): Promise<InferenceResult> {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON_PATH,
      [INFERENCE_SCRIPT, csvPath],
      { maxBuffer: 1024 * 1024 * 50 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          const results = JSON.parse(stdout);
          if (results.error) reject(new Error(results.error));
          else resolve(results as InferenceResult);
        } catch (parseError: any) {
          reject(new Error(`Invalid inference output: ${parseError.message}`));
        }
      }
    );
  });
}

function emitToClients(session: StreamSession, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of session.clients) {
    client.write(payload);
  }
}

function stopSessionTimer(session: StreamSession) {
  if (session.timer) {
    clearInterval(session.timer);
    session.timer = null;
  }
  session.playing = false;
}

function startSessionTimer(session: StreamSession) {
  stopSessionTimer(session);
  if (session.cursor >= session.predictions.length || session.intervalMs <= 0) return;

  session.playing = true;
  session.timer = setInterval(() => {
    if (session.cursor >= session.predictions.length) {
      stopSessionTimer(session);
      emitToClients(session, 'complete', { sessionId: session.id, totalRows: session.predictions.length });
      return;
    }

    const row = session.predictions[session.cursor];
    emitToClients(session, 'telemetry', {
      sessionId: session.id,
      index: session.cursor,
      total: session.predictions.length,
      row,
    });
    session.cursor += 1;
  }, session.intervalMs);
}

function createSession(fileName: string, result: InferenceResult): StreamSession {
  const id = `sess-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const session: StreamSession = {
    id,
    fileName,
    predictions: result.predictions,
    bestThreshold: result.bestThreshold ?? 0.9347,
    cursor: 0,
    playing: false,
    intervalMs: 1000,
    timer: null,
    clients: new Set(),
  };
  streamSessions.set(id, session);
  return session;
}

app.get('/api/health', (_req, res) => {
  const requiredArtifacts = [
    'isolation_forest_model.pkl',
    'robust_scaler.pkl',
    'min_max_scaler.pkl',
    'LSTM_autoencoder_model.pth',
    'fuzzy_model_config.json',
    'eda_summary.json',
    'model_summary.json',
  ];
  const missingArtifacts = requiredArtifacts.filter(
    (name) => !fs.existsSync(path.join(ARTIFACTS_DIR, name))
  );
  const inferenceReady = fs.existsSync(INFERENCE_SCRIPT);
  if (!inferenceReady) missingArtifacts.push('src/inference/run_inference.py');

  res.json({
    ok: missingArtifacts.length === 0,
    python: PYTHON_PATH,
    pythonExists: fs.existsSync(PYTHON_PATH),
    artifactsDir: ARTIFACTS_DIR,
    missingArtifacts,
    hasEdaSummary: fs.existsSync(EDA_SUMMARY_PATH),
    hasModelSummary: fs.existsSync(MODEL_SUMMARY_PATH),
  });
});

app.get('/api/models', (_req, res) => {
  if (!fs.existsSync(MODEL_SUMMARY_PATH)) {
    return res.status(404).json({
      error: 'Model summary not found.',
    });
  }
  try {
    const data = JSON.parse(fs.readFileSync(MODEL_SUMMARY_PATH, 'utf-8'));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/eda', (_req, res) => {
  if (!fs.existsSync(EDA_SUMMARY_PATH)) {
    return res.status(404).json({
      error: 'EDA summary not found.',
    });
  }
  try {
    const data = JSON.parse(fs.readFileSync(EDA_SUMMARY_PATH, 'utf-8'));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inference', upload.single('telemetryFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  try {
    const results = await runPythonInference(filePath);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to run machine learning inference', details: err.message });
  } finally {
    fs.unlink(filePath, () => undefined);
  }
});

app.post('/api/upload-test', upload.single('telemetryFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    const results = await runPythonInference(filePath);
    const session = createSession(fileName, results);

    fs.writeFileSync(
      path.join(sessionsDir, `${session.id}.json`),
      JSON.stringify({
        fileName,
        bestThreshold: session.bestThreshold,
        predictions: session.predictions,
      })
    );

    res.json({
      sessionId: session.id,
      fileName,
      totalProcessedRows: results.totalProcessedRows,
      anomalyRows: results.anomalyRows,
      anomalyPercentage: results.anomalyPercentage,
      bestThreshold: session.bestThreshold,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Inference failed', details: err.message });
  } finally {
    fs.unlink(filePath, () => undefined);
  }
});

app.get('/api/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const speed = (req.query.speed as string) || 'realtime';
  const intervalMs = speed === 'accelerated' ? 200 : speed === 'paused' ? 0 : 1000;

  let session = streamSessions.get(sessionId);
  if (!session) {
    const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const saved = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    session = {
      id: sessionId,
      fileName: saved.fileName,
      predictions: saved.predictions,
      bestThreshold: saved.bestThreshold ?? 0.9347,
      cursor: 0,
      playing: false,
      intervalMs,
      timer: null,
      clients: new Set(),
    };
    streamSessions.set(sessionId, session);
  }

  session.intervalMs = intervalMs;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  session.clients.add(res);

  emitToClients(session, 'session', {
    sessionId: session.id,
    fileName: session.fileName,
    total: session.predictions.length,
    bestThreshold: session.bestThreshold,
    cursor: session.cursor,
  });

  if (intervalMs > 0 && !session.playing) startSessionTimer(session);

  req.on('close', () => {
    session!.clients.delete(res);
    if (session!.clients.size === 0) stopSessionTimer(session!);
  });
});

app.post('/api/stream/:sessionId/control', (req, res) => {
  const session = streamSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action, speed } = req.body as { action?: string; speed?: string };

  if (speed === 'realtime') session.intervalMs = 1000;
  else if (speed === 'accelerated') session.intervalMs = 200;
  else if (speed === 'paused') session.intervalMs = 0;

  if (action === 'pause') {
    stopSessionTimer(session);
  } else if (action === 'reset') {
    stopSessionTimer(session);
    session.cursor = 0;
    emitToClients(session, 'reset', { cursor: 0 });
    if (session.intervalMs > 0) startSessionTimer(session);
  } else if (action === 'play') {
    if (session.intervalMs > 0) startSessionTimer(session);
  } else if (session.intervalMs > 0 && !session.playing && session.cursor < session.predictions.length) {
    startSessionTimer(session);
  }

  res.json({ ok: true, cursor: session.cursor, playing: session.playing, intervalMs: session.intervalMs });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Express] API server running on http://localhost:${PORT}`);
  console.log(`[Express] Python: ${PYTHON_PATH}`);
  console.log(`[Express] Artifacts: ${ARTIFACTS_DIR}`);
  console.log(`[Express] Model summary: ${fs.existsSync(MODEL_SUMMARY_PATH) ? MODEL_SUMMARY_PATH : 'missing'}`);
  if (fs.existsSync(DIST_DIR)) {
    console.log(`[Express] Serving static UI from ${DIST_DIR}`);
  }
});
