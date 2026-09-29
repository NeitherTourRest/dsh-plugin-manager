<#
.SYNOPSIS
  Install the dsh UI plugins from this repository into a dsh profile.

.DESCRIPTION
  Copies each package into `<profile>/node_modules/` and appends one bundle
  block to the profile's `cordis.patch.yml`. The block is delimited by markers,
  so running this twice changes nothing and uninstall.ps1 can remove exactly
  what this script added.

  Why this works without a package manager: dsh resolves a profile's modules
  from two anchors — `<profile>/node_modules` (pnpm-managed, authoritative for
  out-of-tree plugins) and `$DSH_HOME/profiles/node_modules` (a mirror of the
  dsh installation's own dependency closure). A package copied into the first
  anchor resolves `@deepseek-ai/cordis` and `@deepseek-ai/schemastery` through
  the second, so no install step is required.

  The Desktop profile is owned by the Electron application and refuses
  `dsh plugin --profile desktop`. This script writes the same two things the
  in-app Plugins page would, without a package manager.

.PARAMETER Profile
  Profile name to install into. Defaults to `desktop`.

.PARAMETER DshHome
  Harness home. Defaults to $env:DSH_HOME, then to `~/.dsh`.

.PARAMETER Force
  Replace already-installed copies of the packages.

.EXAMPLE
  ./scripts/install.ps1
  ./scripts/install.ps1 -Profile web
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$packages = @(
  @{ Name = 'dsh-client-ui-ball'; Row = 'ui-ball' },
  @{ Name = 'dsh-client-ui-glass'; Row = 'ui-glass' }
)

if (-not $DshHome -or $DshHome -eq '') {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
}

$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path -LiteralPath $profileDir)) {
  throw "dsh profile not found: $profileDir`nStart dsh once with this profile, or pass -Home/-Profile."
}

$modulesDir = Join-Path $profileDir 'node_modules'
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$begin = '# >>> dsh-ui-plugins >>>'
$end = '# <<< dsh-ui-plugins <<<'

Write-Host "profile   $profileDir"
Write-Host "packages  $modulesDir"
Write-Host ''

New-Item -ItemType Directory -Force -Path $modulesDir | Out-Null

foreach ($package in $packages) {
  $source = Join-Path $repoRoot "packages\$($package.Name)"
  $target = Join-Path $modulesDir $package.Name
  if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) {
    throw "package source missing: $source"
  }
  if (Test-Path -LiteralPath $target) {
    if (-not $Force) {
      Write-Host "  keep    $($package.Name) (already present; pass -Force to replace)"
      continue
    }
    Remove-Item -LiteralPath $target -Recurse -Force
  }
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
  Write-Host "  copy    $($package.Name)"
}

# The patch is a top-level YAML array of loader entries. One `insert` entry
# carries both rows; the markers make the block findable and removable.
$block = @(
  $begin
  '- insert:'
) + ($packages | ForEach-Object { "    - id: $($_.Row)`n      name: '$($_.Name)'" }) + @(
  $end
)
$blockText = ($block -join "`n") + "`n"

$existing = if (Test-Path -LiteralPath $patchPath) { Get-Content -Raw -Encoding UTF8 $patchPath } else { '' }
if ($existing -match [regex]::Escape($begin)) {
  Write-Host ''
  Write-Host "  keep    cordis.patch.yml (block already present)"
} else {
  if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { $existing += "`n" }
  Set-Content -LiteralPath $patchPath -Encoding UTF8 -NoNewline -Value ($existing + "`n" + $blockText)
  Write-Host ''
  Write-Host "  patch   cordis.patch.yml"
}

Write-Host ''
Write-Host 'Done. Restart dsh if the profile does not hot-reload its patch layer.'
Write-Host 'Verify with: node test/verify-together.mjs  (repository self-test)'
