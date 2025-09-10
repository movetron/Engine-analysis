import { useState } from 'react';
import type { DiagnosisResult, AnalysisResult } from '@/services/mlService';
import type { WindowFeature } from '@/services/mlService';

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: () => Promise<string | null>;
      runAnalysis: (args: any) => Promise<any>;
      saveGraph: (
        srcPath: string,
      ) => Promise<{ success: boolean; targetPath?: string; error?: string }>;
    };
  }
}

export const FileUploader = ({
  onDataLoad,
  onDiagnosis,
}: {
  onDataLoad: (data: any[]) => void;
  onDiagnosis: (result: DiagnosisResult) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [plotPath, setPlotPath] = useState<string | null | undefined>(null);

  const handleFileSelect = async () => {
    setLoading(true);
    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) {
      setLoading(false);
      return;
    }

    const name = filePath.split('\\').pop()?.split('/').pop() || 'Неизвестный файл';
    setFileName(name);

    try {
      const result: AnalysisResult = await window.electronAPI.runAnalysis({
        filePath,
        fs: 10000,
        windowSec: 1,
        overlap: 0.5,
      });

      if (result.success) {
        setPlotPath(result.plotPath);
      } else {
        alert('Ошибка анализа: ' + result.error);
      }
      const previewLen = Array.isArray(result.previewData) ? result.previewData.length : 0;
      const statsData: WindowFeature[] = Array.isArray(result.statsData) ? result.statsData : [];

      // есть ли фазы
      const hasR = statsData.some((w) => Number.isFinite(w.rms_r));
      const hasS = statsData.some((w) => Number.isFinite(w.rms_s));
      const hasT = statsData.some((w) => Number.isFinite(w.rms_t));
      const insufficient =
        !result.success ||
        previewLen < 100 || // слишком маленькое превью
        statsData.length === 0 || // нет окон
        !hasS ||
        !hasT;

      // соберём примечание
      const noteParts: string[] = [];
      if (previewLen < 100) noteParts.push('мало точек в превью (<100)');
      if (statsData.length === 0) noteParts.push('нет окон для анализа');
      if (!hasS || !hasT) noteParts.push('отсутствуют фазы S/T — показаны только R');
      const note = insufficient ? result.error ?? noteParts.join('; ') : null;

      // отдадим превью в график, если есть
      if (previewLen > 0) {
        onDataLoad(result.previewData.slice(0, 5000));
      }

      // посчитаем метрики для UI
      const anomalies = statsData.filter((d) => d.anomaly_score === 1);
      const anomalyRatio = statsData.length ? (anomalies.length / statsData.length) * 100 : 0;
      // возьмём RMS первого окна (или можно средние — на твой выбор)
      const first = statsData[0];
      const anomalyWindows =
        anomalies.map(({ start, end, imbalance }) => ({ start, end, imbalance })) ?? [];

      const status: DiagnosisResult['status'] = insufficient
        ? 'Недостаточно данных'
        : anomalies.length === 0
        ? 'Норма'
        : anomalyRatio < 5
        ? 'Возможная неисправность'
        : 'Опасное состояние';
      const diagnosis: DiagnosisResult = {
        status,
        anomaly_ratio: anomalyRatio,
        total_samples: statsData.length,
        anomalies: anomalies.length,
        anomalyWindows: anomalies.map(({ start, end, imbalance }) => ({ start, end, imbalance })),
        note,
        success: !insufficient, // <-- важно
        rms_r: Number.isFinite(first?.rms_r) ? first!.rms_r : undefined,
        rms_s: Number.isFinite(first?.rms_s) ? first!.rms_s : undefined,
        rms_t: Number.isFinite(first?.rms_t) ? first!.rms_t : undefined,
      };

      onDiagnosis(diagnosis);
    } catch (err: any) {
      console.error('Ошибка в handleFileSelect:', err);
      onDiagnosis({
        status: 'Недостаточно данных',
        anomaly_ratio: 0,
        total_samples: 0,
        anomalies: 0,
        anomalyWindows: [],
        note: err?.message ?? 'Ошибка анализа',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };
  const saveGraph = async () => {
    if (!plotPath) return;
    const res = await window.electronAPI.saveGraph(plotPath);
    if (!res.success) {
      alert(res.error || 'Не удалось сохранить файл');
    } else {
      console.log('Saved to', res.targetPath);
    }
  };

  return (
    <div className="p-6 h-[280px] h-auto bg-white rounded-xl shadow-lg border border-gray-200 transition-all hover:shadow-xl">
      <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
        📁 Загрузите датасет двигателя
      </h3>
      <button
        onClick={handleFileSelect}
        disabled={loading}
        className={`
          w-full px-5 py-3 rounded-lg font-medium text-white
          transition-all duration-200 transform
          ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-102 active:scale-98'
          }
          shadow-md hover:shadow-lg
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Обработка...
          </span>
        ) : (
          'Выбрать CSV'
        )}
      </button>

      {fileName && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <strong className="text-blue-800">Файл:</strong>{' '}
          <span className="text-blue-700 font-medium">{fileName}</span>
        </div>
      )}
      {/* Прогресс-бар при загрузке */}
      {loading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: '60%' }}
            ></div>
          </div>
          <p className="text-blue-600 text-sm mt-1">Загрузка и обработка данных...</p>
        </div>
      )}
      {plotPath && (
        <div className="mt-6" style={{ marginTop: 30 }}>
          <button
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-98 transition-all shadow hover:shadow-md"
            onClick={saveGraph}
          >
            Сохранить график
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Изображение графика с выделенными аномалиями
          </p>
        </div>
      )}
    </div>
  );
};
