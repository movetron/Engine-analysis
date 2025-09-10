import { contextBridge, ipcRenderer } from 'electron';
console.log('✅ Preload запущен');
// ✅ Тип для аргументов
interface RunAnalysisArgs {
  filePath: string;
  fs?: number;
  windowSec?: number;
  overlap?: number;
}
contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  runAnalysis: (args: RunAnalysisArgs) => ipcRenderer.invoke('run-analysis', args),
  exportToPDF: () => ipcRenderer.invoke('export-to-pdf'),
  saveGraph: (srcPath: string) => ipcRenderer.invoke('save-graph', srcPath),
});
