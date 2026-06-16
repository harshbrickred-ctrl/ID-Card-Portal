$pkg = Get-AppxPackage -Name "CorelCorporation.CorelDRAW" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pkg -or -not $pkg.InstallLocation) {
  Write-Output "NONE"
  exit 1
}

$candidates = @(
  (Join-Path $pkg.InstallLocation "CorelDRAW Store Edition\Programs64\CorelDRW.exe"),
  (Join-Path $pkg.InstallLocation "Programs64\CorelDRW.exe"),
  (Join-Path $pkg.InstallLocation "Draw\Programs64\CorelDRW.exe")
)

foreach ($candidate in $candidates) {
  if (Test-Path -LiteralPath $candidate) {
    Write-Output $candidate
    exit 0
  }
}

Write-Output "NONE"
exit 1
