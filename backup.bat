@echo off
set BACKUP_DIR=G:\My Drive\zairmag-backup
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Database backup хийж байна...
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d icecream_erp -F c -f "%BACKUP_DIR%\db_%TIMESTAMP%.dump"

echo Зураг хуулж байна...
xcopy "C:\erp-zairmag\backend\uploads" "%BACKUP_DIR%\uploads\" /E /I /Y /Q

echo Хуучин backup устгаж байна (7 хоногоос хуучин)...
forfiles /p "%BACKUP_DIR%" /m "db_*.dump" /d -7 /c "cmd /c del @path" 2>nul

echo.
echo Backup дууслаа: %BACKUP_DIR%
pause
