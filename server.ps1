# Simple local HTTP server using System.Net.HttpListener
# Serves files from the directory where the script is executed.

$port = 8085
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server started and listening at http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $rawUrl = $request.RawUrl
            Write-Host "Request: $rawUrl"

            # Strip query string parameters if they exist
            if ($rawUrl.Contains("?")) {
                $rawUrl = $rawUrl.Substring(0, $rawUrl.IndexOf("?"))
            }

            # Decode path to handle spaces and special chars
            $localPath = [System.Uri]::UnescapeDataString($rawUrl)
            if ($localPath -eq "/") {
                $localPath = "/index.html"
            }

            # Resolve path relative to current directory
            $currentDir = Get-Location
            $filePath = Join-Path $currentDir $localPath.Substring(1)

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Map file extension to content type
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css" }
                    ".js"   { "application/javascript" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".png"  { "image/png" }
                    ".gif"  { "image/gif" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }

                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                # 404 Page Not Found
                $response.StatusCode = 404
                $errText = "404 File Not Found: $localPath"
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errText)
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            
            $response.Close()
        } catch {
            Write-Host "Error serving request: $_"
            if ($null -ne $response) {
                try { $response.Close() } catch {}
            }
        }
    }
} catch {
    Write-Error $_
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    Write-Host "Server stopped."
}
