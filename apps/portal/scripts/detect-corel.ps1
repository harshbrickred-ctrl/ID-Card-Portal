$p = Get-AppxPackage -Name "CorelCorporation.CorelDRAW" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($p) {
  Write-Output ($p.Version.ToString() + "|STORE")
} else {
  Write-Output "NONE"
}
