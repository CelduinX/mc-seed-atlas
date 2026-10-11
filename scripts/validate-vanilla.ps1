$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path $PSScriptRoot -Parent
Set-Location $workspacePath
$cachePath = Join-Path $workspacePath '.cache/vanilla'
New-Item -ItemType Directory -Force $cachePath | Out-Null
$manifest = Invoke-RestMethod 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
foreach ($releaseId in @('26.1', '26.1.1', '26.1.2', '26.2', '26.3')) {
    $releaseDirectory = Join-Path $cachePath $releaseId
    New-Item -ItemType Directory -Force $releaseDirectory | Out-Null
    $releaseInfo = Invoke-RestMethod ($manifest.versions | Where-Object { $_.id -eq $releaseId -and $_.type -eq 'release' }).url
    $serverPath = Join-Path $releaseDirectory 'server.jar'
    if (!(Test-Path $serverPath)) { Invoke-WebRequest $releaseInfo.downloads.server.url -OutFile $serverPath }
    $actualHash = (Get-FileHash -LiteralPath $serverPath -Algorithm SHA1).Hash.ToLowerInvariant()
    if ($actualHash -ne $releaseInfo.downloads.server.sha1) { throw "Server hash mismatch: $releaseId" }
    $extractedPath = Join-Path $releaseDirectory 'extracted'
    if (!(Test-Path $extractedPath)) { [System.IO.Compression.ZipFile]::ExtractToDirectory($serverPath, $extractedPath) }
    $classPath = (Get-ChildItem $extractedPath -Recurse -Filter '*.jar' | ForEach-Object FullName) -join [IO.Path]::PathSeparator
    Push-Location $releaseDirectory
    try {
        & java '-Xmx2G' '-cp' $classPath (Join-Path $PSScriptRoot 'VanillaOracle.java') (Join-Path $cachePath 'samples.csv') (Join-Path $cachePath "$releaseId.csv")
    } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Vanilla oracle failed: $releaseId" }
}
& node scripts/compare-vanilla.ts
if ($LASTEXITCODE -ne 0) { throw 'Biome reference mismatch' }
