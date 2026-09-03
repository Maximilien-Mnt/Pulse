$f = 'C:\Users\maxim\Pulse\app\(tabs)\clubs\[clubId]\settings.tsx'
$lines = Get-Content -LiteralPath $f
$out = @()
$skipNext = false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($skipNext) { $skipNext = $false; continue }
  if ($i -lt $lines.Count - 1 -and $lines[$i].Trim() -eq '</SafeScreen>' -and $lines[$i+1].Trim() -eq '</SafeScreen>') {
    $out += $lines[$i]
    $skipNext = $true
  } else {
    $out += $lines[$i]
  }
}
$out | Set-Content -LiteralPath $f -Encoding UTF8
(Get-Content -LiteralPath $f | Measure-Object -Line).Lines
