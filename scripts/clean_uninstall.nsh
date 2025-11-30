!macro customUninstall
  ; Remove the main application data directory where scraped_history.json is stored
  Delete "$APPDATA\gscrape\*.*"
  RMDir /r "$APPDATA\gscrape"

  ; Remove the local application data directory (if it exists)
  Delete "$LOCALAPPDATA\gscrape\*.*"
  RMDir /r "$LOCALAPPDATA\gscrape"

  ; Additional cleanup of any possible data directories
  Delete "$PROGRAMDATA\gscrape\*.*"
  RMDir /r "$PROGRAMDATA\gscrape"

  ; Output message to indicate successful cleanup
  DetailPrint "Removed all gscrape data and settings"
!macroend

; Execute the cleanup during uninstall
!macro installUninstallSection
  Call customUninstall
!macroend

; Execute after uninstall success confirmation
Function .onUninstSuccess
  Call customUninstall
  MessageBox MB_OK "GScrape and all associated data have been completely removed from your system."
FunctionEnd