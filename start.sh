#!/bin/bash

echo "========================================================"
echo "      RadarTG - Автономный сервер мониторинга"
echo "========================================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "[1/2] Установка зависимостей (npm install)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось установить зависимости. Убедитесь, что установлен Node.js."
        exit 1
    fi
    echo "[OK] Зависимости установлены."
fi

echo "[2/2] Запуск сервера RadarTG..."
echo "Откройте в браузере: http://localhost:3000"
echo ""

npx tsx server.ts
