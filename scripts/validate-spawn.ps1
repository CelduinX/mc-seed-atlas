$ErrorActionPreference = 'Stop'
node scripts/create-version-header.ts
if ($LASTEXITCODE -ne 0) { throw 'Version header generation failed' }
docker build -f wasm/Dockerfile --target wasm -t seed-atlas-spawn-reference .
if ($LASTEXITCODE -ne 0) { throw 'Reference build failed' }
$nativeJson = docker run --rm seed-atlas-spawn-reference sh -c 'cd /tmp/atlas-cubiomes && gcc -O3 -fwrapv -I. /app/wasm/spawn-reference.c generator.c noise.c biomes.c layers.c biomenoise.c finders.c -lm -o /tmp/spawn-reference && /tmp/spawn-reference'
if ($LASTEXITCODE -ne 0) { throw 'Native reference failed' }
$native = ($nativeJson -join "`n") | ConvertFrom-Json
$fixtures = Get-Content -Raw -LiteralPath 'tests/spawn-fixtures.json' | ConvertFrom-Json
$difference = Compare-Object $native $fixtures -Property version, large, seed, x, z
if ($difference) { $difference | Format-Table; throw 'Native spawn estimates differ from the fixtures' }
Write-Output "All $($native.Count) native spawn reference fixtures match."
node --import ./tests/setup.ts --test --test-name-pattern 'WASM spawn' tests/generator.test.ts
if ($LASTEXITCODE -ne 0) { throw 'WASM spawn comparison failed' }
