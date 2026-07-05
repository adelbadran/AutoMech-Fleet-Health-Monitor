import { SensorData, SystemLog, AIPrediction, InferenceRow, ModelAnomalyState } from './types';

export const SENSOR_SPECS = {
  rpm: { name: 'Engine_RPM', unit: 'rpm', min: 800, max: 6500, minNormal: 800, maxNormal: 4500, subsystem: 'Engine' as const },
  speed: { name: 'Vehicle_Speed', unit: 'km/h', min: 0, max: 250, minNormal: 0, maxNormal: 140, subsystem: 'Engine' as const },
  coolant_temp: { name: 'Coolant_Temp', unit: '°C', min: 60, max: 130, minNormal: 80, maxNormal: 105, subsystem: 'Engine' as const },
  oil_pressure: { name: 'Oil_Pressure', unit: 'psi', min: 10, max: 100, minNormal: 25, maxNormal: 75, subsystem: 'Oil system' as const },
  vibration_z: { name: 'Vibration_Z', unit: 'g', min: 0.05, max: 4.0, minNormal: 0.1, maxNormal: 1.8, subsystem: 'Suspension' as const },
  engine_load: { name: 'Engine_Load', unit: '%', min: 0, max: 100, minNormal: 5, maxNormal: 90, subsystem: 'Engine' as const },
  fuel_rate: { name: 'Fuel_Rate', unit: 'L/h', min: 0, max: 35, minNormal: 1.5, maxNormal: 20.0, subsystem: 'Oil system' as const },
  intake_temp: { name: 'Intake_Air_Temp', unit: '°C', min: 15, max: 70, minNormal: 20, maxNormal: 55, subsystem: 'Engine' as const },
  battery_voltage: { name: 'Battery_Voltage', unit: 'V', min: 10.0, max: 15.5, minNormal: 12.4, maxNormal: 14.8, subsystem: 'Battery' as const },
  throttle_pos: { name: 'Throttle_Position', unit: '%', min: 0, max: 100, minNormal: 0, maxNormal: 95, subsystem: 'Engine' as const },
  ambient_temp: { name: 'Ambient_Temp', unit: '°C', min: -10, max: 50, minNormal: 10, maxNormal: 42, subsystem: 'Engine' as const },
  brake_pressure: { name: 'Brake_Pressure', unit: 'psi', min: 0, max: 1500, minNormal: 0, maxNormal: 1000, subsystem: 'Brakes' as const },
  acc_x: { name: 'Acceleration_X', unit: 'g', min: -1.5, max: 1.5, minNormal: -0.8, maxNormal: 0.8, subsystem: 'Suspension' as const },
  acc_y: { name: 'Acceleration_Y', unit: 'g', min: -1.5, max: 1.5, minNormal: -0.8, maxNormal: 0.8, subsystem: 'Suspension' as const },
};

export const COLUMN_TO_SENSOR_ID: Record<string, keyof typeof SENSOR_SPECS> = {
  Engine_RPM: 'rpm',
  Vehicle_Speed: 'speed',
  Coolant_Temp: 'coolant_temp',
  Oil_Pressure: 'oil_pressure',
  Vibration_Z: 'vibration_z',
  Engine_Load: 'engine_load',
  Fuel_Rate: 'fuel_rate',
  Intake_Air_Temp: 'intake_temp',
  Battery_Voltage: 'battery_voltage',
  Throttle_Position: 'throttle_pos',
  Ambient_Temp: 'ambient_temp',
  Brake_Pressure: 'brake_pressure',
  Acceleration_X: 'acc_x',
  Acceleration_Y: 'acc_y',
};

const VALID_SUBSYSTEMS = ['Engine', 'Battery', 'Brakes', 'Suspension', 'Oil system'] as const;
export const DEFAULT_MODEL_THRESHOLD = 0.9347;

const IDLE_BOUNDS: Record<keyof typeof SENSOR_SPECS, { min: number; max: number }> = {
  rpm: { min: 0, max: 500 },
  speed: { min: 0, max: 5 },
  coolant_temp: { min: 5, max: 95 },
  oil_pressure: { min: 0, max: 35 },
  vibration_z: { min: 0, max: 0.6 },
  engine_load: { min: 0, max: 20 },
  fuel_rate: { min: 0, max: 8 },
  intake_temp: { min: 5, max: 65 },
  battery_voltage: { min: 12.0, max: 14.9 },
  throttle_pos: { min: 0, max: 15 },
  ambient_temp: { min: -5, max: 45 },
  brake_pressure: { min: 0, max: 100 },
  acc_x: { min: -0.35, max: 0.35 },
  acc_y: { min: -0.35, max: 0.35 },
};

const RUNNING_BOUNDS: Record<keyof typeof SENSOR_SPECS, { min: number; max: number }> = {
  rpm: { min: 600, max: 4500 },
  speed: { min: 0, max: 140 },
  coolant_temp: { min: 70, max: 105 },
  oil_pressure: { min: 10, max: 75 },
  vibration_z: { min: 0.05, max: 1.8 },
  engine_load: { min: 5, max: 90 },
  fuel_rate: { min: 0.5, max: 22 },
  intake_temp: { min: 15, max: 55 },
  battery_voltage: { min: 12.2, max: 14.8 },
  throttle_pos: { min: 0, max: 95 },
  ambient_temp: { min: 5, max: 42 },
  brake_pressure: { min: 0, max: 1000 },
  acc_x: { min: -0.8, max: 0.8 },
  acc_y: { min: -0.8, max: 0.8 },
};

export type EngineContext = 'idle' | 'running';

export function resolveEngineContext(rpm: number, speed: number): EngineContext {
  return rpm < 500 && speed < 5 ? 'idle' : 'running';
}

function applyCriticalOverrides(
  sensorId: keyof typeof SENSOR_SPECS,
  value: number,
  status: SensorData['status'],
  context: EngineContext,
): SensorData['status'] {
  if (sensorId === 'coolant_temp' && (value > 110 || value < 0)) return 'danger';
  if (sensorId === 'oil_pressure' && context === 'running' && value < 8) return 'danger';
  if (sensorId === 'vibration_z' && value > 2.5) return 'danger';
  if (sensorId === 'battery_voltage' && (value < 11.5 || value > 15.2)) return 'danger';
  if (sensorId === 'brake_pressure' && value > 1200) return 'danger';
  return status;
}

export function computeSensorStatus(
  sensorId: keyof typeof SENSOR_SPECS,
  value: number,
  context: EngineContext,
): SensorData['status'] {
  const bounds = context === 'idle' ? IDLE_BOUNDS[sensorId] : RUNNING_BOUNDS[sensorId];
  if (value >= bounds.min && value <= bounds.max) {
    return applyCriticalOverrides(sensorId, value, 'normal', context);
  }

  const span = Math.max(bounds.max - bounds.min, 1);
  const softMargin = span * 0.12;
  const hardMargin = span * 0.28;

  const below = bounds.min - value;
  const above = value - bounds.max;
  const deviation = Math.max(below, above, 0);

  let status: SensorData['status'] = deviation > hardMargin ? 'danger' : 'warning';
  return applyCriticalOverrides(sensorId, value, status, context);
}

function applyModelAnomalyHint(
  sensorId: keyof typeof SENSOR_SPECS,
  status: SensorData['status'],
  spec: (typeof SENSOR_SPECS)[keyof typeof SENSOR_SPECS],
  isAnomaly: boolean,
  subsystem: ModelAnomalyState['subsystem'],
  anomalyReason: string | null | undefined,
): SensorData['status'] {
  if (!isAnomaly || !subsystem) return status;

  const reasonNames = anomalyReason ?? '';
  const sensorNamedInReason =
    reasonNames.includes(spec.name) ||
    reasonNames.includes(sensorId) ||
    reasonNames.includes(spec.name.replace(/_/g, ' '));

  if (sensorNamedInReason) return 'danger';
  if (spec.subsystem === subsystem && status === 'normal') return 'warning';
  return status;
}

export function parseSubsystem(value: string | null | undefined): ModelAnomalyState['subsystem'] {
  if (!value || value === 'None') return null;
  return VALID_SUBSYSTEMS.includes(value as any) ? (value as ModelAnomalyState['subsystem']) : null;
}

export function sensorsFromInferenceRow(
  currentSensors: Record<string, SensorData>,
  row: InferenceRow,
  threshold: number = DEFAULT_MODEL_THRESHOLD,
): Record<string, SensorData> {
  const nextSensors = { ...currentSensors };
  const rpm = Number(row.Engine_RPM) || 0;
  const speed = Number(row.Vehicle_Speed) || 0;
  const context = resolveEngineContext(rpm, speed);
  const isAnomaly = row.fusionScore >= threshold;
  const subsystem = isAnomaly ? parseSubsystem(row.anomalySubsystem) : null;

  Object.entries(COLUMN_TO_SENSOR_ID).forEach(([col, sensorId]) => {
    const spec = SENSOR_SPECS[sensorId];
    const rawVal = (row as unknown as Record<string, number>)[col];
    if (rawVal === undefined || !nextSensors[sensorId]) return;

    const value = parseFloat(Number(rawVal).toFixed(
      sensorId === 'rpm' || sensorId === 'speed' || sensorId === 'brake_pressure' ? 0 : 2
    ));

    let status = computeSensorStatus(sensorId, value, context);
    status = applyModelAnomalyHint(
      sensorId,
      status,
      spec,
      isAnomaly,
      subsystem,
      row.anomalyReason,
    );

    const hist = [...nextSensors[sensorId].history, value];
    if (hist.length > 30) hist.shift();

    nextSensors[sensorId] = { ...nextSensors[sensorId], value, status, history: hist };
  });

  return nextSensors;
}

export function predictionFromInferenceRow(row: InferenceRow, threshold: number): AIPrediction {
  const timeStr = row.timestamp?.includes(' ')
    ? row.timestamp.split(' ')[1]?.substring(0, 8) || row.timestamp
    : row.timestamp;

  return {
    timestamp: timeStr,
    isolationForestScore: row.isolationForestScore,
    lstmScore: row.lstmScore,
    fusionScore: row.fusionScore,
    isAnomaly: row.fusionScore >= threshold,
    confidence: row.confidence,
    inferenceTimeMs: 18.5,
  };
}

export function anomalyStateFromInferenceRow(row: InferenceRow, threshold: number): ModelAnomalyState {
  const isAnomaly = row.fusionScore >= threshold;
  const confidence = isAnomaly
    ? parseFloat((85.0 + row.fusionScore * 14.5).toFixed(1))
    : parseFloat((95.5 + ((row.rowIndex * 17) % 420) / 100).toFixed(1));
  const topSensorMatch = row.anomalyReason?.match(/^([A-Za-z0-9_]+)/);
  return {
    isAnomaly,
    fusionScore: row.fusionScore,
    confidence,
    reason: isAnomaly ? row.anomalyReason : null,
    subsystem: isAnomaly ? parseSubsystem(row.anomalySubsystem) : null,
    topSensor: topSensorMatch?.[1] || null,
  };
}

export function logFromInferenceRow(row: InferenceRow, threshold: number): SystemLog | null {
  const isAnomaly = row.fusionScore >= threshold;
  if (!isAnomaly) return null;

  const timeStr = row.timestamp?.includes(' ')
    ? row.timestamp.split(' ')[1]?.substring(0, 8) || row.timestamp
    : row.timestamp;

  return {
    id: `ml_${row.rowIndex}_${Date.now()}`,
    timestamp: timeStr,
    message: 'Anomaly detected',
    severity: row.fusionScore >= threshold + 0.05 ? 'critical' : 'warning',
    subsystem: parseSubsystem(row.anomalySubsystem) || undefined,
    iconName: 'AlertTriangle',
  };
}

export function getInitialSensors(): Record<string, SensorData> {
  const sensors: Record<string, SensorData> = {};
  const historyLength = 15;

  Object.entries(SENSOR_SPECS).forEach(([id, spec]) => {
    const history = Array(historyLength).fill(0);

    sensors[id] = {
      id,
      name: spec.name,
      value: 0,
      unit: spec.unit,
      minNormal: spec.minNormal,
      maxNormal: spec.maxNormal,
      subsystem: spec.subsystem,
      status: 'normal',
      history,
    };
  });

  return sensors;
}

export function getInitialLogs(): SystemLog[] {
  return [];
}

export function getInitialPredictions(): AIPrediction[] {
  return [];
}

export function updateSensorsAndGeneratePrediction(
  currentSensors: Record<string, SensorData>,
  tickCount: number,
  threshold: number = 0.45
): {
  sensors: Record<string, SensorData>;
  prediction: AIPrediction;
  triggeredLog: SystemLog | null;
  modelAnomaly: ModelAnomalyState;
} {
  const nextSensors = { ...currentSensors };
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let throttleChange = (Math.sin(tickCount * 0.1) * 15) + (Math.cos(tickCount * 0.05) * 5) + 30;
  throttleChange = Math.max(5, Math.min(85, throttleChange));

  let baseBrake = Math.max(0, Math.sin(tickCount * 0.08) > 0.7 ? (Math.sin(tickCount * 0.08) * 400) : 0);

  Object.keys(nextSensors).forEach((id) => {
    const sensor = { ...nextSensors[id] };
    const spec = SENSOR_SPECS[id as keyof typeof SENSOR_SPECS];
    let baseValue = sensor.value;

    if (id === 'throttle_pos') {
      baseValue = throttleChange;
    } else if (id === 'rpm') {
      baseValue = 800 + (throttleChange * 45) + (Math.random() - 0.5) * 100;
    } else if (id === 'speed') {
      const targetSpeed = (throttleChange * 1.5) - (baseBrake * 0.05);
      baseValue = Math.max(0, sensor.value + (targetSpeed - sensor.value) * 0.1);
    } else if (id === 'fuel_rate') {
      const rpmVal = nextSensors['rpm'] ? nextSensors['rpm'].value : 2000;
      baseValue = 1.5 + (rpmVal / 6500) * 18 + (Math.random() * 0.8);
    } else if (id === 'engine_load') {
      baseValue = 10 + (throttleChange * 0.8) + (Math.random() - 0.5) * 4;
    } else if (id === 'coolant_temp') {
      const rpmVal = nextSensors['rpm'] ? nextSensors['rpm'].value : 2000;
      const targetTemp = 85 + (rpmVal / 6500) * 15;
      baseValue = sensor.value + (targetTemp - sensor.value) * 0.02;
    } else if (id === 'brake_pressure') {
      baseValue = baseBrake;
    } else if (id === 'acc_x' || id === 'acc_y') {
      baseValue = (Math.random() - 0.5) * 0.15;
    } else if (id === 'vibration_z') {
      const speedVal = nextSensors['speed'] ? nextSensors['speed'].value : 60;
      baseValue = 0.1 + (speedVal / 100) * 0.4 + Math.random() * 0.1;
    } else {
      const noise = (Math.random() - 0.5) * (spec.maxNormal - spec.minNormal) * 0.02;
      baseValue += noise;
    }

    const finalVal = Math.max(spec.min, Math.min(spec.max, baseValue));
    sensor.value = parseFloat(finalVal.toFixed(id === 'rpm' || id === 'speed' || id === 'brake_pressure' ? 0 : 2));

    if (sensor.value < spec.minNormal || sensor.value > spec.maxNormal) {
      const outerRange = (spec.max - spec.min) * 0.1;
      if (sensor.value < (spec.minNormal - outerRange) || sensor.value > (spec.maxNormal + outerRange)) {
        sensor.status = 'danger';
      } else {
        sensor.status = 'warning';
      }
    } else {
      sensor.status = 'normal';
    }

    const hist = [...sensor.history, sensor.value];
    if (hist.length > 20) hist.shift();
    sensor.history = hist;

    nextSensors[id] = sensor;
  });

  const dangerCount = Object.values(nextSensors).filter(s => s.status === 'danger').length;
  const warningCount = Object.values(nextSensors).filter(s => s.status === 'warning').length;

  let forestScore = 0.06 + Math.random() * 0.1;
  let lstmScore = 0.04 + Math.random() * 0.06;

  if (dangerCount > 0) {
    forestScore = 0.42 + Math.random() * 0.15;
    lstmScore = 0.38 + Math.random() * 0.15;
  } else if (warningCount > 1) {
    forestScore = 0.25 + Math.random() * 0.15;
    lstmScore = 0.22 + Math.random() * 0.15;
  }

  const fusionScore = (forestScore * 0.55) + (lstmScore * 0.45);
  const isAnomaly = fusionScore > threshold;
  const confidence = isAnomaly
    ? parseFloat((85.0 + fusionScore * 14.5).toFixed(1))
    : parseFloat((95.5 + Math.random() * 4.2).toFixed(1));

  const prediction: AIPrediction = {
    timestamp: timeStr,
    isolationForestScore: parseFloat(forestScore.toFixed(3)),
    lstmScore: parseFloat(lstmScore.toFixed(3)),
    fusionScore: parseFloat(fusionScore.toFixed(3)),
    isAnomaly,
    confidence,
    inferenceTimeMs: parseFloat((12.1 + Math.random() * 4.6 + (isAnomaly ? 3.5 : 0)).toFixed(1)),
  };

  let triggeredLog: SystemLog | null = null;
  if (isAnomaly && dangerCount > 0) {
    const dangerousSensors = Object.values(nextSensors).filter((s) => s.status === 'danger');
    const firstDangerous = dangerousSensors[0];
    if (firstDangerous) {
      triggeredLog = {
        id: `sim_${tickCount}_${firstDangerous.id}`,
        timestamp: timeStr,
        message: `Sensor alert: ${firstDangerous.name} out of range (${firstDangerous.value} ${firstDangerous.unit})`,
        severity: 'warning',
        subsystem: firstDangerous.subsystem,
        iconName: 'Activity',
      };
    }
  }

  const topSensor = Object.values(nextSensors).find((s) => s.status === 'danger') || Object.values(nextSensors).find((s) => s.status === 'warning');
  const modelAnomaly: ModelAnomalyState = {
    isAnomaly,
    fusionScore,
    confidence,
    reason: isAnomaly && topSensor ? `${topSensor.name} deviation detected` : null,
    subsystem: isAnomaly && topSensor ? topSensor.subsystem : null,
    topSensor: topSensor?.name || null,
  };

  return {
    sensors: nextSensors,
    prediction,
    triggeredLog,
    modelAnomaly,
  };
}
