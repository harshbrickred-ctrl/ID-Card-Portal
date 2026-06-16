param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"

$ExportWidth = 1011
$ExportHeight = 638
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) {
  $ScriptRoot = Split-Path -Parent $PSCommandPath
}

function Resolve-FullPath([string]$p) {
  if (-not $p) { return $null }
  return [System.IO.Path]::GetFullPath($p)
}

function Get-CorelExePath {
  $helper = Join-Path $ScriptRoot "get-corel-path.ps1"
  if (Test-Path -LiteralPath $helper) {
    $path = (& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper 2>$null | Select-Object -Last 1).Trim()
    if ($path -and $path -ne "NONE" -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }

  $pkg = Get-AppxPackage -Name "CorelCorporation.CorelDRAW" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pkg -and $pkg.InstallLocation) {
    $candidates = @(
      (Join-Path $pkg.InstallLocation "CorelDRAW Store Edition\Programs64\CorelDRW.exe"),
      (Join-Path $pkg.InstallLocation "Programs64\CorelDRW.exe")
    )
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }

  return $null
}

function Wait-ForCorelWindow([int]$TimeoutSec) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $proc = Get-Process CorelDRW -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($proc) { return $proc }
    Start-Sleep -Seconds 2
  }
  return $null
}

function Stop-CorelProcesses {
  Get-Process CorelDRW -ErrorAction SilentlyContinue | ForEach-Object {
    try { $_.CloseMainWindow() | Out-Null } catch { }
  }
  Start-Sleep -Seconds 2
  Get-Process CorelDRW -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

$InputPath = Resolve-FullPath $InputPath
$OutputPath = Resolve-FullPath $OutputPath

if (-not $InputPath -or -not (Test-Path -LiteralPath $InputPath)) {
  Write-Error "CDR file not found: $InputPath"
  exit 1
}

if (-not $OutputPath) {
  Write-Error "Output path is required."
  exit 1
}

$corelExe = Get-CorelExePath
if (-not $corelExe) {
  Write-Error "CorelDRAW Store Edition executable was not found."
  exit 1
}

$outDir = Split-Path -Parent $OutputPath
if ([string]::IsNullOrWhiteSpace($outDir)) {
  Write-Error "Invalid output path: $OutputPath"
  exit 1
}
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

if (Test-Path -LiteralPath $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

Stop-CorelProcesses

# Launch CorelDRAW with the CDR file directly.
Start-Process -FilePath $corelExe -ArgumentList "`"$InputPath`"" | Out-Null

$window = Wait-ForCorelWindow -TimeoutSec 120
if (-not $window) {
  Write-Error "CorelDRAW did not open in time. Open the .cdr manually and export PNG at ${ExportWidth}x${ExportHeight} px."
  exit 1
}

if (-not ([System.Management.Automation.PSTypeName]"IdPortalWin32").Type) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IdPortalWin32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
}

[IdPortalWin32]::ShowWindow($window.MainWindowHandle, 9) | Out-Null
[IdPortalWin32]::SetForegroundWindow($window.MainWindowHandle) | Out-Null
Start-Sleep -Seconds 5

$shell = New-Object -ComObject WScript.Shell
if (-not $shell.AppActivate($window.Id)) {
  $shell.AppActivate("CorelDRAW") | Out-Null
}
Start-Sleep -Seconds 1

# File > Export
$shell.SendKeys("%f")
Start-Sleep -Milliseconds 900
$shell.SendKeys("e")
Start-Sleep -Seconds 4

# Save as PNG
$shell.SendKeys($OutputPath)
Start-Sleep -Milliseconds 700
$shell.SendKeys("{ENTER}")
Start-Sleep -Seconds 5

# Confirm bitmap export options (page should already be CR-80 size).
$shell.SendKeys("{ENTER}")
Start-Sleep -Seconds 6

# Dismiss any success/info dialogs.
$shell.SendKeys("{ENTER}")
Start-Sleep -Seconds 2

if (-not (Test-Path -LiteralPath $OutputPath)) {
  Write-Error "CorelDRAW did not create $OutputPath. Ensure page is 85.6x53.98 mm, then export PNG at ${ExportWidth}x${ExportHeight} px manually."
  exit 1
}

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($OutputPath)
$w = $img.Width
$h = $img.Height
$img.Dispose()

if ($w -ne $ExportWidth -or $h -ne $ExportHeight) {
  Write-Error "Export is ${w}x${h} px; required ${ExportWidth}x${ExportHeight} px. Set page to 85.6x53.98 mm in CorelDRAW."
  exit 1
}

Stop-CorelProcesses
exit 0
