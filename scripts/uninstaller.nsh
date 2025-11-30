; Custom NSIS script for cleaning up all application data during uninstallation

; Define the application name
!define APP_NAME "gscrape"

; Function to remove all application data during uninstall
Function un.DeleteAppData
  ; Remove the main application data directory where scraped_history.json is stored
  Delete "$APPDATA\${APP_NAME}\*.*"
  RMDir /r "$APPDATA\${APP_NAME}"

  ; Remove the local application data directory (if it exists)
  Delete "$LOCALAPPDATA\${APP_NAME}\*.*"
  RMDir /r "$LOCALAPPDATA\${APP_NAME}"

  ; Remove any potential roaming data (alternative path)
  Delete "$APPDATA\Roaming\${APP_NAME}\*.*"
  RMDir /r "$APPDATA\Roaming\${APP_NAME}"

  ; Remove any remaining gscrape-related directories in app data
  Delete "$APPDATA\gscrape\*.*"
  RMDir /r "$APPDATA\gscrape"
  Delete "$LOCALAPPDATA\gscrape\*.*"
  RMDir /r "$LOCALAPPDATA\gscrape"

  ; Output message to indicate successful cleanup
  DetailPrint "Removed all gscrape data and settings"
FunctionEnd

; Execute the cleanup function during uninstall
Section "un.UninstallSection"
  Call un.DeleteAppData
SectionEnd

; Call the cleanup function after the user confirms uninstall
Function .onUninstSuccess
  HideWindow
  Call un.DeleteAppData
  MessageBox MB_OK "GScrape and all associated data have been completely removed from your system."
FunctionEnd