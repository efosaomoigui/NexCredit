param(
  [string]$BaseUrl = "http://localhost:6100",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"

function Invoke-WarmRequest {
  param(
    [string]$Name,
    [string]$Url,
    [string]$CookieHeader = ""
  )

  $curlArgs = @("-s", "-o", "NUL", "-w", "%{http_code} %{time_starttransfer} %{time_total}", $Url)
  if ($CookieHeader) {
    $curlArgs = @("-s", "-o", "NUL", "-H", $CookieHeader, "-w", "%{http_code} %{time_starttransfer} %{time_total}", $Url)
  }

  $result = & curl.exe @curlArgs
  Write-Output ("{0}: {1}" -f $Name, $result)
}

Write-Output ("Pre-warming admin routes at {0}" -f $BaseUrl)
Invoke-WarmRequest -Name "login_page" -Url "$BaseUrl/login"
Invoke-WarmRequest -Name "auth_me" -Url "$BaseUrl/api/auth/me" -CookieHeader ("Cookie: token={0}" -f $Token)
Invoke-WarmRequest -Name "system_engines" -Url "$BaseUrl/api/system/engines" -CookieHeader ("Cookie: token={0}" -f $Token)
Invoke-WarmRequest -Name "lending_products" -Url "$BaseUrl/api/admin/lending-products" -CookieHeader ("Cookie: token={0}" -f $Token)
