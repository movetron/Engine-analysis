export interface DiagnosisResult {
  status: 'Норма' | 'Возможная неисправность' | 'Опасное состояние' | 'Недостаточно данных';
  anomaly_ratio: number;
  total_samples: number;
  anomalies: number;
  success: boolean;
  rms_r?: number;
  rms_s?: number;
  rms_t?: number;
  error?: string;
  anomalyWindows?: Array<{
    start: number;
    end: number;
    imbalance: number;
  }>;
  note?: string | null;
}
export interface WindowFeature {
  start: number;
  end: number;
  rms_r: number;
  rms_s: number;
  rms_t: number;
  imbalance: number;
  anomaly_score: 0 | 1;
}

export interface SensorData {
  current_R: number;
  current_S: number;
  current_T: number;
}
export interface AnalysisResult {
  success: boolean;
  error?: string | null;
  previewData: any[]; // downsample/preview
  statsData: WindowFeature[]; // рассчитанные окна/признаки
  previewPath: string;
  statsPath: string;
  plotPath?: string | null;
  note?: string | null;
}
export async function diagnoseCurrent(data: number[][]): Promise<DiagnosisResult> {
  const res = await fetch('http://localhost:8000/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    throw new Error('Ошибка при анализе данных');
  }

  return res.json();
}
