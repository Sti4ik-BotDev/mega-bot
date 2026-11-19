@echo off
cd /d "G:\AI-Projects\CRM-BOT"
:loop
echo ========================================
echo   Запуск мега-бота...
echo ========================================
node mega-bot.js
echo.
echo Бот остановился. Перезапуск через 3 секунды...
timeout /t 3 /nobreak >nul
goto loop
