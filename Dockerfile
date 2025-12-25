# 1. Aşama: React Kodunu Derle
FROM node:18-alpine as build-step
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. Aşama: Python Sunucusunu Kur
FROM python:3.9-slim
WORKDIR /app/backend

# Gerekli kütüphaneleri yükle
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# React build dosyalarını Python'un yanına taşı
COPY --from=build-step /app/frontend/dist /app/frontend/dist

# 5000 portunu içeriden aç
EXPOSE 5000
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
