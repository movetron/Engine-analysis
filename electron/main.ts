import { app, BrowserWindow, ipcMain, Menu, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import mime from 'mime-types';
import * as Papa from 'papaparse';
console.log('✅ Electron main.js запущен');

// Отключаем GPU (обход ошибки)
app.disableHardwareAcceleration();

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('in-process-gpu');

app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow: BrowserWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.webContents.openDevTools();

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // кастомный протокол для безопасного чтения локальных файлов
  protocol.handle('safe-file', async (request) => {
    const filePath = decodeURIComponent(request.url.replace('safe-file://', ''));
    try {
      const buffer = await fs.promises.readFile(filePath);
      const data = new Uint8Array(buffer);
      const contentType = (mime.lookup(filePath) || 'application/octet-stream') as string;
      return new Response(data, { headers: { 'Content-Type': contentType } });
    } catch (err) {
      console.error('safe-file error:', err);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Чтение файла
ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (err: any) {
    console.error('Ошибка чтения файла:', err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths[0]; // возвращаем путь
});

const pythonDir = path.join(__dirname, '..', 'ml-model');

// Проверим, существует ли папка
if (!fs.existsSync(pythonDir)) {
  console.error('❌ Папка ml-model/ не найдена:', pythonDir);
}

const tmpDir = path.join(os.tmpdir(), 'it-case');
// Убедитесь, что папка существует
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Функция для запуска Python-скрипта
function spawnPython(scriptPath: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [scriptPath, ...args]);

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Python exited with code ${code}: ${error}`));
      }
    });
  });
}

ipcMain.handle('run-analysis', async (event, args) => {
  console.log('📥 run-analysis получил аргументы:', args);

  if (!args) {
    console.error('❌ args is undefined');
    throw new Error('Аргументы не переданы');
  }
  const { filePath, samplingRate = 10000, windowSec = 1, overlap = 0.5 } = args;
  if (!filePath) {
    throw new Error('filePath не передан');
  }
  const previewPath = path.join(tmpDir, 'preview.csv');
  const plotPath = path.join(tmpDir, 'plot.png');

  try {
    // 1. Даунсэмпл→ preview.csv
    await spawnPython(path.join(pythonDir, 'preview.py'), [filePath, previewPath]);

    // 2. Анализ → stats.json

    const analysisOutput = await spawnPython(path.join(pythonDir, 'analyze.py'), [
      filePath,
      plotPath,
      '--samplingRate',
      samplingRate.toString(),
      '--window-sec',
      windowSec.toString(),
      '--overlap',
      overlap.toString(),
    ]);
    // Python возвращает JSON в stdout → парсим
    const analysisResult = JSON.parse(analysisOutput);

    const previewData = await fs.promises.readFile(previewPath, 'utf-8');
    const parsedPreview = Papa.parse(previewData, { header: true }).data;

    // Берём путь, который реально вернул Python
    const statsPath = analysisResult.statsJsonPath || '';
    const statsData = analysisResult.statsData || [];

    // 3. График (опционально)
    // await spawnPython('python/plot.py', [previewPath, statsPath, plotPath]);

    const hasData = Array.isArray(statsData) && statsData.length > 0;
    return {
      success: hasData,
      error: analysisResult.error,
      previewPath,
      statsPath,
      plotPath,
      previewData: parsedPreview,
      statsData,
    };
  } catch (err: any) {
    console.error('Ошибка анализа:', err);
    return {
      success: false,
      error: err.message || 'Не удалось выполнить анализ',
      previewPath,
      statsPath: '',
      plotPath: '',
      previewData: [],
      statsData: [],
    };
  }
});

// main.ts
ipcMain.handle('export-to-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    try {
      const pdf = await win.webContents.printToPDF({
        margins: {
          marginType: 'default', // или 'none', 'printableArea', 'custom'
        },

        printBackground: true,
        landscape: false,
        pageSize: 'A4',
      });

      const path = await dialog.showSaveDialog(win, {
        defaultPath: 'diagnosis-report.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (!path.canceled && path.filePath) {
        await fs.promises.writeFile(path.filePath, pdf);
        console.log('✅ PDF сохранён:', path.filePath);
      }
    } catch (err) {
      console.error('❌ Ошибка генерации PDF:', err);
    }
  }
});
// отдельный IPC для «Сохранить график» из UI (без <a/>)
ipcMain.handle('save-graph', async (_event, srcPath: string) => {
  if (!srcPath) return { success: false, error: 'Нет пути к исходному файлу' };

  const { canceled, filePath: target } = await dialog.showSaveDialog({
    title: 'Сохранить график как…',
    defaultPath: path.basename(srcPath),
    filters: [{ name: 'Images', extensions: ['png'] }],
  });
  if (canceled || !target) return { success: false, error: 'Сохранение отменено' };

  try {
    await fs.promises.copyFile(srcPath, target);
    return { success: true, targetPath: target };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Не удалось сохранить' };
  }
});
