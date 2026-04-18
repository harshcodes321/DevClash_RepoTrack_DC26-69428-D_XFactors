@echo off
echo Starting Repo Architecture Navigator...
echo.

REM Start Backend
echo [1/2] Starting FastAPI backend on port 8000...
start "Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/2] Starting React frontend on port 3000...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers started!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
