param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"

$corel = $null
$doc = $null

try {
  $corel = New-Object -ComObject CorelDRAW.Application
  $corel.Visible = $false
  $doc = $corel.OpenDocument($InputPath)

  # cdrPNG = 769 in CorelDRAW VBA; ExportBitmap is the most reliable export path.
  $doc.ExportBitmap($OutputPath, 769, 2, 1, 1011, 638, 300, 300, 1, 0, 0, 0)
  $doc.Close()
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
finally {
  if ($corel) {
    $corel.Quit()
  }
}

if (-not (Test-Path $OutputPath)) {
  Write-Error "CorelDRAW did not create the PNG export."
  exit 1
}
