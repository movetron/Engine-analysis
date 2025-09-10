# ml-model/train.py
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Загружаем ваш CSV (пример)
# Убедитесь, что файл лежит рядом или укажите правильный путь
file_path = "A:/1.JS/architectur/it-case/assets/current_2.csv"  # ← укажите путь к вашему файлу

# Читаем данные
df = pd.read_csv(file_path)

# Выбираем только токовые сигналы
features = ['current_R', 'current_S', 'current_T']
X = df[features].dropna()

# Обучаем Isolation Forest
model = IsolationForest(
    contamination=0.1,    # 10% аномалий
    random_state=42,
    n_estimators=100
)
model.fit(X)

# Сохраняем модель
joblib.dump(model, 'ml-model/model.pkl')
print("✅ Модель обучена и сохранена в ml-model/model.pkl")