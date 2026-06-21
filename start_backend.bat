@echo off
cd /d "C:\Users\Power tech\Desktop\MAM\MAM App"
call "%~dp0start_db.bat"
echo Starting MAM backend on port 8001...
"C:\Users\Power tech\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8001
pause
