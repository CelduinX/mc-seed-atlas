param([string[]]$Versions = @())
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$workspacePath = Split-Path $PSScriptRoot -Parent
Set-Location $workspacePath
$cachePath = Join-Path $workspacePath '.cache/vanilla'
New-Item -ItemType Directory -Force $cachePath | Out-Null
$manifest = Invoke-RestMethod 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
if (!$Versions.Count) { $Versions = (& node --input-type=module -e "import { VERSIONS } from './src/versions.ts'; console.log(JSON.stringify(VERSIONS))") | ConvertFrom-Json }
foreach ($releaseId in $Versions) {
    $releaseDirectory = Join-Path $cachePath $releaseId
    New-Item -ItemType Directory -Force $releaseDirectory | Out-Null
    $releaseInfo = Invoke-RestMethod ($manifest.versions | Where-Object { $_.id -eq $releaseId -and $_.type -eq 'release' }).url
    $serverPath = Join-Path $releaseDirectory 'server.jar'
    if (!(Test-Path $serverPath)) {
        & curl.exe --fail --location --silent --show-error --output $serverPath $releaseInfo.downloads.server.url
        if ($LASTEXITCODE -ne 0) { throw "Server download failed: $releaseId" }
    }
    $actualHash = (Get-FileHash -LiteralPath $serverPath -Algorithm SHA1).Hash.ToLowerInvariant()
    if ($actualHash -ne $releaseInfo.downloads.server.sha1) { throw "Server hash mismatch: $releaseId" }
    $oracleArgs = @()
    if ($releaseInfo.downloads.server_mappings) {
        $mappingsPath = Join-Path $releaseDirectory 'server-mappings.txt'
        if (!(Test-Path $mappingsPath)) {
            & curl.exe --fail --location --silent --show-error --output $mappingsPath $releaseInfo.downloads.server_mappings.url
            if ($LASTEXITCODE -ne 0) { throw "Mappings download failed: $releaseId" }
        }
        if ((Get-FileHash -LiteralPath $mappingsPath -Algorithm SHA1).Hash.ToLowerInvariant() -ne $releaseInfo.downloads.server_mappings.sha1) { throw "Mappings hash mismatch: $releaseId" }
        $oracleArgs = @($mappingsPath)
    }
    $extractedPath = Join-Path $releaseDirectory 'extracted'
    if (!(Test-Path $extractedPath)) { [System.IO.Compression.ZipFile]::ExtractToDirectory($serverPath, $extractedPath) }
    $classPath = (Get-ChildItem $extractedPath -Recurse -Filter '*.jar' | ForEach-Object FullName) -join [IO.Path]::PathSeparator
    Push-Location $releaseDirectory
    try {
        & java '-Xmx2G' '-cp' $classPath (Join-Path $PSScriptRoot 'VanillaOracle.java') (Join-Path $cachePath 'samples.csv') (Join-Path $cachePath "$releaseId.csv") @oracleArgs
    } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Vanilla oracle failed: $releaseId" }
}
& node scripts/compare-vanilla.ts @Versions
if ($LASTEXITCODE -ne 0) { throw 'Biome reference mismatch' }
