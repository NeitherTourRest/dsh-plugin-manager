<#
.SYNOPSIS
  Remove the dsh UI plugins that install.ps1 added to a dsh profile.

.DESCRIPTION
  Deletes the delimited block from the profile's `cordis.patch.yml` and removes
  the copied package directories. Anything outside the markers is left alone,
  and running this on a profile that was never installed into changes nothing.

.PARAMETER Profile
  Profile name to remove from. Defaults to `desktop`.

.PARAMETER DshHome
  Harness home. Defaults to $env:DSH_HOME, then to `~/.dsh`.

.EXAMPLE
  ./scripts/uninstall.ps1
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$names = @('dsh-client-ui-ball', 'dsh-client-ui-glass')

if (-not $DshHome -or $DshHome -eq '') {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
}

$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path -LiteralPath $profileDir)) {
  throw "dsh profile not found: $profileDir"
}

$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$begin = '# >>> dsh-ui-plugins >>>'
$end = '# <<< dsh-ui-plugins <<<'

if (Test-Path -LiteralPath $patchPath) {
  $text = Get-Content -Raw -Encoding UTF8 $patchPath
  $pattern = "(?ms)^\r?\n?" + [regex]::Escape($begin) + ".*?" + [regex]::Escape($end) + "\r?\n?"
  if ($text -match $pattern) {
    $stripped = [regex]::Replace($text, $pattern, '')
    Set-Content -LiteralPath $patchPath -Encoding UTF8 -NoNewline -Value $stripped
    Write-Host "  patch   removed the dsh-ui-plugins block"
  } else {
    Write-Host "  keep    cordis.patch.yml (no block found)"
  }
}

$modulesDir = Join-Path $profileDir 'node_modules'
foreach ($name in $names) {
  $target = Join-Path $modulesDir $name
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Host "  remove  $name"
  }
}

Write-Host ''
Write-Host 'Done. Restart dsh if the profile does not hot-reload its patch layer.'
