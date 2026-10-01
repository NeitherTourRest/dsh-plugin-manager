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

.PARAMETER Only
  Install only the named packages, by directory name or by module row id.
  The packages are independent: the ball runs with nothing else installed, and
  glass runs with or without the ball. Omit this to install everything here.

.EXAMPLE
  ./scripts/install.ps1
  ./scripts/install.ps1 -Profile web
  ./scripts/install.ps1 -Only dsh-client-ui-ball
  ./scripts/install.ps1 -Only ui-glass
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome,
  [switch]$Force,
  [string[]]$Only
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$available = @(
  @{ Name = 'dsh-client-ui-ball'; Row = 'ui-ball' },
  @{ Name = 'dsh-client-ui-glass'; Row = 'ui-glass' }
)

$packages = $available
if ($Only) {
  $packages = @($available | Where-Object { $Only -contains $_.Name -or $Only -contains $_.Row })
  if ($packages.Count -eq 0) {
    $known = ($available | ForEach-Object { "$($_.Name) ($($_.Row))" }) -join ', '
    throw "-Only matched nothing. Known packages: $known"
  }
}

if (-not $DshHome -or $DshHome -eq '') {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
}

$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path -LiteralPath $profileDir)) {
  throw "dsh profile not found: $profileDir`nStart dsh once with this profile, or pass -Home/-Profile."
}

$modulesDir = Join-Path $profileDir 'node_modules'
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$begin = '# >>> dsh-plugin-manager >>>'
$end = '# <<< dsh-plugin-manager <<<'
# The repository was called dsh-ui-plugins before the rename. Replace that block
# rather than leaving a profile with two entries for the same packages.
$legacyBegin = '# >>> dsh-ui-plugins >>>'
$legacyEnd = '# <<< dsh-ui-plugins <<<'

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
# carries every installed row; the markers make the block findable and
# removable.
#
# The block is rebuilt from the packages present on disk, never from the ones
# this run targeted. Installing one package into a profile that already has
# another must add its row to the existing block — skipping because a block
# exists would copy the package without ever loading it, which looks exactly
# like a broken plugin.
$installed = @($available | Where-Object { Test-Path -LiteralPath (Join-Path $modulesDir $_.Name) })
$block = @(
  $begin
  '- insert:'
) + ($installed | ForEach-Object { "    - id: $($_.Row)`n      name: '$($_.Name)'" }) + @(
  $end
)
$blockText = ($block -join "`n") + "`n"

$existing = if (Test-Path -LiteralPath $patchPath) { Get-Content -Raw -Encoding UTF8 $patchPath } else { '' }
# Drop whatever block is there — the current name and the pre-rename one — and
# write the rebuilt block in its place.
$before = $existing
foreach ($pair in @(@($begin, $end), @($legacyBegin, $legacyEnd))) {
  $pattern = "(?ms)^\r?\n?" + [regex]::Escape($pair[0]) + ".*?" + [regex]::Escape($pair[1]) + "\r?\n?"
  $existing = [regex]::Replace($existing, $pattern, '')
}
$migrated = $existing -ne $before -and $before -match [regex]::Escape($legacyBegin)
if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { $existing += "`n" }
Set-Content -LiteralPath $patchPath -Encoding UTF8 -NoNewline -Value ($existing + "`n" + $blockText)
Write-Host ''
if ($migrated) { Write-Host '  migrate replaced the block written under the old repository name' }
else { Write-Host "  patch   cordis.patch.yml ($($installed.Count) row(s))" }

Write-Host ''
Write-Host 'Done. Restart dsh if the profile does not hot-reload its patch layer.'
Write-Host 'Verify with: node test/verify-together.mjs  (repository self-test)'
