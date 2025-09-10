import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer

def main():
    result = {
        "success": False,
        "error": None,
        "previewData": [],
        "statsData": [],
        "previewPath": "",
        "statsPath": "",
        "statsJsonPath": "",
        "plotPath": None
    }

    try:
        if len(sys.argv) < 3:
            raise ValueError("Не передан путь к файлу")

        file_path = sys.argv[1]
        base_dir = os.path.dirname(file_path)
        plot_path = sys.argv[2]   

        # Загружаем CSV
        df = pd.read_csv(file_path)
        if df.shape[0] == 0:
            raise ValueError("Файл пуст")

        # Проверим, что есть нужные столбцы
        required_cols = ["current_R", "current_S", "current_T"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Нет нужного столбца: {col}")

        # ------------------
        # Preview (первые 100 строк)
        # ------------------
        preview_data = df.head(100).to_csv(index=False).splitlines()
        preview_path = os.path.join(base_dir, "preview.csv")
        with open(preview_path, "w", encoding="utf-8") as f:
            f.write("\n".join(preview_data))
        # ------------------
        # Вычисление признаков для диагностики
        # ------------------
        window_size = 1000
        stats = []

        for i in range(0, len(df), window_size):
            window = df.iloc[i:i+window_size]
            if len(window) == 0:
                continue
            rms_r = np.sqrt(np.mean(window["current_R"]**2))
            rms_s = np.sqrt(np.mean(window["current_S"]**2))
            rms_t = np.sqrt(np.mean(window["current_T"]**2))

            imbalance = np.std([rms_r, rms_s, rms_t])

            stats.append({
                "start": int(i),
                "end": int(i + window_size),
                "rms_r": float(rms_r),
                "rms_s": float(rms_s),
                "rms_t": float(rms_t),
                "imbalance": float(imbalance),
                "anomaly_score": 0  # временно, обновим ниже
            })
        
       
        stats_df = pd.DataFrame(stats)  
        if len(stats_df) == 0:
            raise ValueError("Недостаточно данных для расчета признаков")
        # ------------------
        # Обнаружение аномалий (Isolation Forest)
        # ------------------
        features = stats_df[["rms_r", "rms_s", "rms_t", "imbalance"]].values
        # Заполняем NaN средними значениями
        imputer = SimpleImputer(strategy='mean')
        X = imputer.fit_transform(features)
        
        model = IsolationForest(contamination=0.05, random_state=42)
        preds = model.fit_predict(X)
        stats_df["anomaly_score"] = (preds == -1).astype(int)

        # ------------------
        # Сохраняем файлы (чтобы React мог открыть)
        # ------------------
        stats_path = os.path.join(base_dir, "stats.csv")
        stats_df.to_csv(stats_path, index=False)

        stats_clean = stats_df.replace([np.nan, np.inf, -np.inf], None)


        stats_json_path  = os.path.join(base_dir, "stats.json")
        with open(stats_json_path, "w", encoding="utf-8") as f:
            json.dump(stats_clean.to_dict(orient="records"), f, ensure_ascii=False, indent=2)
        result["statsJsonPath"] = stats_json_path
        
        plt.figure(figsize=(10, 5))
        plt.plot(stats_df["imbalance"], label="Imbalance", color="blue")
        plt.scatter(stats_df.index, stats_df["anomaly_score"]*stats_df["imbalance"], 
                    color="red", label="Anomalies")
        plt.legend()
        plt.tight_layout()
        plt.savefig(plot_path)
        plt.close()
        
        # Формируем результат
        # ------------------
        result = {
            "success": True,
            "error": None,
            "previewData": preview_data,
            "statsData": stats_clean.to_dict(orient="records"),
            "previewPath": preview_path,
            "statsPath": stats_path,
            "statsJsonPath": stats_json_path,
            "plotPath": plot_path
        }
        # Сохраняем CSV со статистикой рядом с графиком
        stats_df.to_csv(result["statsPath"], index=False)

    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "previewData": [],
            "statsData": [],
            "previewPath": "",
            "statsPath": "",
            "plotPath": None
        }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
