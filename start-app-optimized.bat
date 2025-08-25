@echo off
echo ===============================================
echo         CoPed Optimized Application Launcher
echo ===============================================
echo.

echo Starting Optimized Backend Server with LangChain Warm-up...
cd /d "%~dp0backend"
start "CoPed Backend" python start_optimized.py

echo.
echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Development Server...
cd /d "%~dp0frontend"
start "CoPed Frontend" npm run dev

echo.
echo ===============================================
echo Both servers are starting up with optimization!
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo LangChain RAG will be pre-warmed for faster responses
echo ===============================================
echo.
echo Press any key to close this window...
pause >nul
