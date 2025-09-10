// src/types/globals.d.ts
declare global {
  interface Window {
    electronAPI: {
      readFile: (path: string) => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;
      openFileDialog: () => Promise<string | null>;
      runAnalysis: (args: {
        filePath: string;
        fs?: number;
        windowSec?: number;
        overlap?: number;
      }) => Promise<{
        success: boolean;
        data?: string;
        error?: string;
        previewPath: string;
        previewData: any[];
        statsData: Array<{
          start: number;
          end: number;
          rms_r: number;
          rms_s: number;
          rms_t: number;
          imbalance: number;
          anomaly_score: 0 | 1;
          [key: string]: any;
        }>;
        statsPath: string;
        plotPath?: string;
      }>;
      exportToPDF: () => Promise<void>;
    };
  }
}

export {};
