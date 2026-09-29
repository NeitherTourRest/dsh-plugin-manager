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
$begin = '# >>> dsh-plugin-manager >>>'
$end = '# <<< dsh-plugin-manager <<<'
# The repository was called dsh-ui-plugins before the rename. A profile patched
# by that version still carries its block, and must still be cleanable here.
$legacyBegin = '# >>> dsh-ui-plugins >>>'
$legacyEnd = '# <<< dsh-ui-plugins <<<'

if (Test-Path -LiteralPath $patchPath) {
  $text = Get-Content -Raw -Encoding UTF8 $patchPath
  $stripped = $text
  $removed = @()
  foreach ($pair in @(@($begin, $end), @($legacyBegin, $legacyEnd))) {
    $pattern = "(?ms)^\r?\n?" + [regex]::Escape($pair[0]) + ".*?" + [regex]::Escape($pair[1]) + "\r?\n?"
    if ($stripped -match $pattern) {
      $stripped = [regex]::Replace($stripped, $pattern, '')
      $removed += $pair[0]
    }
  }
  if ($removed.Count -gt 0) {
    Set-Content -LiteralPath $patchPath -Encoding UTF8 -NoNewline -Value $stripped
    foreach ($marker in $removed) { Write-Host "  patch   removed the $marker block" }
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
