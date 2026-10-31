# Extract the supplied curriculum without requiring Word or a DOCX library.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$archive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot 'assets/progress_tracker.docx'))
try {
  $reader = [System.IO.StreamReader]::new($archive.GetEntry('word/document.xml').Open())
  try { $xml = [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
} finally { $archive.Dispose() }
$namespace = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
$namespace.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$paragraphs = $xml.SelectNodes('//w:p',$namespace) | ForEach-Object { ($_.SelectNodes('.//w:t',$namespace) | ForEach-Object { $_.InnerText }) -join '' }
$weeks = [System.Collections.Generic.List[object]]::new()
$current = $null
foreach ($raw in $paragraphs) {
  $line = $raw.Trim()
  if (-not $line -or $line -match '^Month \d') { continue }
  if ($line -match '^W(\d+)(?:\s+(.*))?$') {
    $number = [int]$matches[1]
    $title = $matches[2]
    $current = [ordered]@{ number = $number; title = $title; milestone = $false; prerequisite = ''; topics = [System.Collections.Generic.List[string]]::new(); practice = ''; acceptance = '' }
    $weeks.Add($current)
    continue
  }
  if ($null -eq $current) { continue }
  if ($line -match '^\d.*(?:Oct|Nov|Dec|Jan|Feb|Mar|Apr)') { continue }
  if (-not $current.title) { $current.title = $line; continue }
  if ($line -eq 'Essential') { continue }
  if ($line -eq 'Milestone') { $current.milestone = $true; continue }
  if ($line.StartsWith('Prerequisite:')) { $current.prerequisite = $line.Substring(13).Trim(); continue }
  if ($line.StartsWith('Practice:')) { $current.practice = $line.Substring(9).Trim(); continue }
  if ($line.StartsWith('Acceptance criteria:')) { $current.acceptance = $line.Substring(20).Trim(); continue }
  $current.topics.Add($line)
}
if ($weeks.Count -ne 26) { throw "Expected 26 weeks, found $($weeks.Count)" }
foreach ($week in $weeks) {
  if (-not $week.title -or -not $week.practice -or -not $week.acceptance -or $week.topics.Count -lt 3) { throw "Incomplete content for week $($week.number)" }
}
$directory = Join-Path $projectRoot 'data'
[System.IO.Directory]::CreateDirectory($directory) | Out-Null
[System.IO.File]::WriteAllText((Join-Path $directory 'learning-roadmap.json'),($weeks | ConvertTo-Json -Depth 10),[System.Text.UTF8Encoding]::new($false))
Write-Output "Imported $($weeks.Count) curriculum weeks from assets/progress_tracker.docx."
