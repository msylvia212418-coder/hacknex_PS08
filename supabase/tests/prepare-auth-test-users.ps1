# Create disposable users through Supabase Auth for database_foundation.test.sql.
# Run after `supabase start` and before `supabase test db --local`.
$ErrorActionPreference = 'Stop'
$statusLines = & npx --yes supabase status --output env
if ($LASTEXITCODE -ne 0) { throw 'Supabase status failed. Start the local stack first.' }
$values = @{}
foreach ($line in $statusLines) {
  if ($line -match '^([^=]+)=(.*)$') { $values[$matches[1]] = $matches[2].Trim('"') }
}
$adminKey = $values['SERVICE_ROLE_KEY']
if (-not $adminKey) { throw 'Could not read the local Supabase service role key.' }
$headers = @{ apikey = $adminKey; Authorization = "Bearer $adminKey"; 'Content-Type' = 'application/json' }
$authAdminUrl = 'http://127.0.0.1:54321/auth/v1/admin/users'
$fixturePassword = 'Veriproof-Local-Only!2026'
$users = (Invoke-RestMethod -Method Get -Uri "${authAdminUrl}?page=1&per_page=100" -Headers $headers).users
foreach ($email in @('veriproof-test-a@example.test', 'veriproof-test-b@example.test')) {
  $existing = $users | Where-Object { $_.email -eq $email } | Select-Object -First 1
  if (-not $existing) {
    $body = @{ email = $email; password = $fixturePassword; email_confirm = $true } | ConvertTo-Json
    $user = Invoke-RestMethod -Method Post -Uri $authAdminUrl -Headers $headers -Body $body
    $users += $user
    Write-Output "Created disposable local Auth user $email ($($user.id))."
  } else {
    $body = @{ password = $fixturePassword; email_confirm = $true } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "$authAdminUrl/$($existing.id)" -Headers $headers -Body $body | Out-Null
  }
}
