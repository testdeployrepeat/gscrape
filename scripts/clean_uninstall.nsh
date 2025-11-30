!pragma warning disable 6010
!macro customUninstall
  ; Remove the main application data directory where scraped_history.json is stored
  Delete "$APPDATA\gscrape\*.*"
  RMDir /r "$APPDATA\gscrape"

  ; Remove the local application data directory (if it exists)
  Delete "$LOCALAPPDATA\gscrape\*.*"
  RMDir /r "$LOCALAPPDATA\gscrape"

  ; Remove the updater directory
  Delete "$LOCALAPPDATA\gscrape-updater\*.*"
  RMDir /r "$LOCALAPPDATA\gscrape-updater"

  ; Additional cleanup of any possible data directories
  ; Delete "$COMMONAPPDATA\gscrape\*.*"
  ; RMDir /r "$COMMONAPPDATA\gscrape"

  ; Remove installation directory
  RMDir /r "$INSTDIR"

  ; Output message to indicate successful cleanup
  DetailPrint "Removed all gscrape data and settings"
!macroend

; Execute the cleanup during uninstall
!macro installUninstallSection
  !insertmacro customUninstall
!macroend

; Execute after uninstall success confirmation
Function .onUninstSuccess
  !insertmacro customUninstall
  MessageBox MB_OK "GScrape and all associated data have been completely removed from your system."
FunctionEnd