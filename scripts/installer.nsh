; Custom NSIS installer script for GScrape
; This script customizes the installer appearance and behavior

!include "MUI2.nsh"

; Custom welcome page with disclaimer
!define MUI_PAGE_CUSTOMFUNCTION_PRE WelcomePagePre
!define MUI_WELCOMEPAGE_TITLE "Welcome to GScrape Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of GScrape - Google Maps Business Scraper.$\r$\n$\r$\nCreated by Rob De Guia$\r$\n$\r$\n⚠️ IMPORTANT DISCLAIMER:$\r$\n$\r$\nGScrape is intended for educational and personal use only. By installing this software, you agree to:$\r$\n$\r$\n• Comply with Google Maps' Terms of Service$\r$\n• Use this tool responsibly and ethically$\r$\n• Accept that the author is not responsible for any misuse$\r$\n$\r$\nClick Next to continue."

; Custom finish page
!define MUI_FINISHPAGE_TITLE "GScrape Installation Complete"
!define MUI_FINISHPAGE_TEXT "GScrape has been successfully installed on your computer.$\r$\n$\r$\nThank you for using GScrape!$\r$\n$\r$\nCreated with ❤️ by Rob De Guia$\r$\nGitHub: @testdeployrepeat"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch GScrape now"

; License page with disclaimer
!macro customInstall
  ; Show custom disclaimer page
  !insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\disclaimer.txt"
!macroend

Function WelcomePagePre
  ; This function runs before the welcome page
FunctionEnd
