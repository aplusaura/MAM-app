@echo off
echo Starting PostgreSQL 18...

net start postgresql-x64-18 2>nul
if %ERRORLEVEL% == 0 (
    echo PostgreSQL service started successfully.
    goto :wait
)

echo PostgreSQL service not found or already running. Trying pg_ctl...
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" 2>nul
if %ERRORLEVEL% == 0 (
    echo PostgreSQL started via pg_ctl.
    goto :wait
)

echo WARNING: Could not start PostgreSQL. It may already be running.

:wait
timeout /t 3 /nobreak >nul
echo PostgreSQL started
