param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"

$corel = $null
$doc = $null

function Try-ExportBitmap([object]$document, [string]$path) {
  $document.ExportBitmap($path, 769, 2, 1, 1011, 638, 300, 300, 1, 0, 0, 0)
}

function Try-ExportPng([object]$document, [string]$path) {
  $document.Export($path, 769, 0)
}

try {
  $corel = New-Object -ComObject CorelDRAW.Application
  $corel.Visible = $false
  $doc = $corel.OpenDocument($InputPath)

  try {
    Try-ExportBitmap $doc $OutputPath
  }
  catch {
    Try-ExportPng $doc $OutputPath
  }

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
