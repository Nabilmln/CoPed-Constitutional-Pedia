@echo off
echo ===============================================
echo         CoPed Application Launcher
echo ===============================================
echo.

echo Starting Backend Server...
cd /d "c:\Users\USER DK\OneDrive\Documents\KKP\CoPed\backend"
start cmd /k "npm start"

echo.
echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend Development Server...
cd /d "c:\Users\USER DK\OneDrive\Documents\KKP\CoPed\frontend"
start cmd /k "npm run dev"

echo.
echo ===============================================
echo Both servers are starting up!
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:3000
echo ===============================================
echo.
echo Press any key to close this window...
pause > nul
