# ml-model/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware  
import joblib
import pandas as pd
import numpy as np
from typing import List

app = FastAPI()
# ✅ Разрешаем CORS для React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ← ваш React-сервер
    allow_credentials=True,
    allow_methods=["*"],  # разрешаем все методы (GET, POST и т.д.)
    allow_headers=["*"],  # разрешаем все заголовки
)
try:
    model = joblib.load('ml-model/model.pkl')
except Exception as e:
    print(f"❌ Ошибка загрузки модели: {e}")
    model = None

class CurrentData(BaseModel):
        List[List[float]]    # [[R, S, T], ...]

@app.post("/predict")
def predict_anomalies(request: CurrentData):
    data_list = request.data

    # Преобразуем в DataFrame
    data = pd.DataFrame(data_list, columns=['current_R', 'current_S', 'current_T'])
    
    # Удаляем строки с NaN
    data_clean = data.dropna()
    
    # Проверяем, есть ли данные
    if data_clean.empty:
        return {
            "status": "Недостаточно данных",
            "anomaly_ratio": 0,
            "total_samples": 0,
            "anomalies": 0
        }
      # ✅ НОВАЯ ПРОВЕРКА: нужно минимум 10 точек
    if len(data_clean) < 10:
        return {
            "status": "Недостаточно данных",
            "anomaly_ratio": 0,
            "total_samples": len(data_clean),
            "anomalies": 0
        }
    
    # ✅ Проверка: все ли значения нулевые или почти одинаковые?
    if data_clean[['current_R', 'current_S', 'current_T']].std().sum() < 1e-6:
        return {
            "status": "Недостаточно данных",
            "anomaly_ratio": 0,
            "total_samples": len(data_clean),
            "anomalies": 0
        }
    # Проверяем, что хотя бы 1 строка
    if len(data_clean) < 1:
        return {
            "status": "Недостаточно данных",
            "anomaly_ratio": 0,
            "total_samples": 0,
            "anomalies": 0
        }
    
    # Предсказание
    try:
        preds = model.predict(data_clean)
        anomaly_ratio = np.mean(preds == -1)
        
        if anomaly_ratio == 0:
            status = "Норма"
        elif anomaly_ratio < 0.05:
            status = "Возможная неисправность"
        else:
            status = "Опасное состояние"
        
        return {
            "status": status,
            "anomaly_ratio": round(anomaly_ratio * 100, 2),
            "total_samples": len(preds),
            "anomalies": int((preds == -1).sum())
        }
    except Exception as e:
        print(f"❌ Ошибка модели: {e}")
        return {
            "status": "Ошибка анализа",
            "anomaly_ratio": 0,
            "total_samples": 0,
            "anomalies": 0
        }