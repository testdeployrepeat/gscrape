@echo off
echo GScrape v1.0.0 Cleanup Script
echo This will completely remove all GScrape data from your system.
echo.

REM Define specific GScrape data directories (only exact matches, not patterns)
set "APPDATA_DIR=%APPDATA%\gscrape"
set "LOCALAPPDATA_DIR=%LOCALAPPDATA%\gscrape"
set "PROGRAMDATA_DIR=%PROGRAMDATA%\gscrape"

REM Remove only exact GScrape data directories after verifying they contain GScrape data
if exist "%APPDATA_DIR%" (
    if exist "%APPDATA_DIR%\scraped_history.json" (
        echo Removing GScrape data directory: %APPDATA_DIR%
        rmdir /s /q "%APPDATA_DIR%"
        echo Removed GScrape data directory: %APPDATA_DIR%
    ) else (
        echo Skipping directory (not GScrape data): %APPDATA_DIR%
    )
)

if exist "%LOCALAPPDATA_DIR%" (
    if exist "%LOCALAPPDATA_DIR%\scraped_history.json" (
        echo Removing GScrape data directory: %LOCALAPPDATA_DIR%
        rmdir /s /q "%LOCALAPPDATA_DIR%"
        echo Removed GScrape data directory: %LOCALAPPDATA_DIR%
    ) else (
        echo Skipping directory (not GScrape data): %LOCALAPPDATA_DIR%
    )
)

if exist "%PROGRAMDATA_DIR%" (
    if exist "%PROGRAMDATA_DIR%\scraped_history.json" (
        echo Removing GScrape data directory: %PROGRAMDATA_DIR%
        rmdir /s /q "%PROGRAMDATA_DIR%"
        echo Removed GScrape data directory: %PROGRAMDATA_DIR%
    ) else (
        echo Skipping directory (not GScrape data): %PROGRAMDATA_DIR%
    )
)

echo.
echo Cleanup complete!
echo You can now safely uninstall GScrape v1.0.0 from 'Add or Remove Programs'.
echo.
pause