param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"

# CR-80 ID card at 300 DPI
$ExportWidth = 1011
$ExportHeight = 638
$ExportDpi = 300

$corel = $null
$doc = $null

function Try-ExportBitmap([object]$document, [string]$path) {
  # Filter 769 = PNG; export full page bitmap at exact print pixels
  $document.ExportBitmap($path, 769, 2, 1, $ExportWidth, $ExportHeight, $ExportDpi, $ExportDpi, 1, 0, 0, 0)
}

function Try-ExportPng([object]$document, [string]$path) {
  $document.Export($path, 769, 0)
}

$progIds = @(
  "CorelDRAW.Application",
  "CorelDRAW.Application.27",
  "CorelDRAW.Application.26",
  "CorelDRAW.Application.25",
  "CorelDRAW.Application.24",
  "CorelDRW.Application"
)

try {
  foreach ($progId in $progIds) {
    try {
      $corel = New-Object -ComObject $progId
      break
    }
    catch {
      $corel = $null
    }
  }
  if (-not $corel) {
    throw "CorelDRAW COM automation is not available. Install CorelDRAW Graphics Suite (desktop/subscription), not Store Edition."
  }
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

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($OutputPath)
$w = $img.Width
$h = $img.Height
$img.Dispose()
if ($w -ne $ExportWidth -or $h -ne $ExportHeight) {
  Write-Error "CorelDRAW export is ${w}x${h} px; required ${ExportWidth}x${ExportHeight} px. Set page to 85.6x53.98 mm in CorelDRAW."
  exit 1
}
