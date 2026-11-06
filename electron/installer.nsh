!macro customInstall
  ; Recreate installer-created shortcuts with the same icon shipped in resources.
  Delete "$DESKTOP\Medo Game Launcher.lnk"
  CreateShortCut "$DESKTOP\Medo Game Launcher.lnk" "$INSTDIR\Medo Game Launcher.exe" "" "$INSTDIR\resources\medo-icon.ico" 0
  Delete "$SMPROGRAMS\Medo Game Launcher\Medo Game Launcher.lnk"
  CreateShortCut "$SMPROGRAMS\Medo Game Launcher\Medo Game Launcher.lnk" "$INSTDIR\Medo Game Launcher.exe" "" "$INSTDIR\resources\medo-icon.ico" 0
!macroend
