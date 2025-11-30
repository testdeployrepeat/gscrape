# GScrape v1.0.0 Clean Uninstall Script
# This script removes all GScrape data that may have been left behind by v1.0.0
# Run this script before uninstalling v1.0.0 to completely remove all data

Write-Host "GScrape v1.0.0 Cleanup Script" -ForegroundColor Green
Write-Host "This will completely remove all GScrape data from your system." -ForegroundColor Yellow
Write-Host ""

# Define specific GScrape data directories (only exact matches, not patterns)
$dataDirectories = @(
    "$env:APPDATA\gscrape",
    "$env:LOCALAPPDATA\gscrape",
    "$env:PROGRAMDATA\gscrape"
)

# Remove only exact GScrape data directories
foreach ($dir in $dataDirectories) {
    if (Test-Path $dir) {
        # Verify this is actually a GScrape directory by checking for expected files
        $isGScrapeDir = Test-Path "$dir\scraped_history.json" -PathType Leaf

        if ($isGScrapeDir) {
            Write-Host "Removing GScrape data directory: $dir" -ForegroundColor Yellow
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "Removed GScrape data directory: $dir" -ForegroundColor Green
        } else {
            Write-Host "Skipping directory (not GScrape data): $dir" -ForegroundColor Gray
        }
    } else {
        Write-Host "Directory not found: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "You can now safely uninstall GScrape v1.0.0 from 'Add or Remove Programs'." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..."
[void][System.Console]::ReadKey($true)