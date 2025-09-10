import { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { ChartViewer } from './components/ChartViewer';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { DiagnosisResult } from './services/mlService';
import './index.css';
function App() {
  const [data, setData] = useState<any[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);

  return (
    <div style={{ padding: 20 }}>
      <h1 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
        ИИ-Диагностика оборудования
      </h1>
      <div className="block">
        <div className="flex gap-10">
          <FileUploader onDataLoad={setData} onDiagnosis={setDiagnosis} />
          {diagnosis && <DiagnosticsPanel result={diagnosis} />}
        </div>
        <div className="w-[1730px] mt-10">{data.length > 0 && <ChartViewer data={data} />}</div>
      </div>
      <button
        onClick={async () => {
          //@ts-ignore
          await window.electronAPI.exportToPDF();
        }}
        style={{ marginTop: 30 }}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mt-4"
      >
        📄 Сохранить отчёт как PDF
      </button>
    </div>
  );
}

export default App;
