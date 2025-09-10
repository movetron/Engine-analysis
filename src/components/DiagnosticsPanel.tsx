import { DiagnosisResult } from '../services/mlService';
import styles from '../scss/DiagnosticsPanel.module.scss';

interface StatRow {
  rms_r: number | null;
  rms_s: number | null;
  rms_t: number | null;
  imbalance: number | null;
  anomaly_score: number | null;
}
interface Props {
  statsData: StatRow[];
}

export const safeNumber = (val: number | null | undefined, digits = 3) => {
  if (val === null || val === undefined) return '—';
  if (!Number.isFinite(val)) return '—'; // ловим NaN, Infinity
  return val.toFixed(digits);
};

export const DiagnosticsPanel = ({ result }: { result: DiagnosisResult | null }) => {
  if (!result) return <p>Анализ не проведен</p>;
  // сопоставляем статус с CSS-модулем
  const statusClassMap: Record<DiagnosisResult['status'], string> = {
    Норма: styles['status-normal'],
    'Возможная неисправность': styles['status-warning'],
    'Опасное состояние': styles['status-danger'],
    'Недостаточно данных': styles['status-insufficient'],
  };
  const statusClass = statusClassMap[result.status];

  return (
    <div className="p-6 flex gap-10 bg-white rounded-lg shadow-md border-r-4 border border-gray-200 transition-all hover:shadow-lg">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium text-white
      ${result.status === 'Норма' && 'bg-green-500'}
      ${result.status === 'Возможная неисправность' && 'bg-yellow-500'}
      ${result.status === 'Опасное состояние' && 'bg-red-600'}
      ${result.status === 'Недостаточно данных' && 'bg-gray-400'}`}
          >
            {result.status}
          </span>
          {result.note && <span className={'text-gray-500 text-sm'}>{result.note}</span>}
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div className="p-3 bg-gray-50 rounded">
            <strong>RMS R:</strong> {safeNumber(result.rms_r)}
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <strong>RMS S:</strong> {safeNumber(result.rms_s)}
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <strong>RMS T:</strong> {safeNumber(result.rms_t)}
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">📊 Результат диагностики</h3>
        <div className="flex gap-5">
          <p className="mb-4">
            <strong>Состояние:</strong> {result.status}
          </p>
          {result.anomalyWindows && result.anomalyWindows.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4 className="font-medium mb-2">Обнаруженные аномалии:</h4>
              <ul className="list-disc list-inside max-h-40 overflow-y-auto space-y-1 text-sm text-gray-700">
                {result.anomalyWindows.map((win) => (
                  <li
                    style={{
                      margin: 15,
                    }}
                    key={win.start}
                  >
                    Участок {win.start}–{win.end}: дисбаланс {safeNumber(win.imbalance)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.total_samples > 0 ? (
            <div className="mt-4 space-y-1 text-sm">
              <p>
                <strong>Аномалий:</strong> {result.anomalies} из {result.total_samples}
              </p>
              <p>
                <strong>Доля аномалий:</strong> {result.anomaly_ratio}%
              </p>
            </div>
          ) : (
            <p className="text-gray-500 italic"></p>
          )}
        </div>
      </div>
    </div>
  );
};
