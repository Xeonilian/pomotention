# scripts/screenshot.ps1
# Corrected Final Version: Fixes syntax and null reference errors.

# --- Parameters Definition ---
# param block MUST be the first executable code in the script.
param (
    [Parameter(Mandatory=$true)]
    [string]$topic,

    [Parameter(Mandatory=$true)]
    [ValidateSet("before", "after", "fix", "a", "b", "f")]
    [string]$statusInput
)

# --- Script Configuration ---
# This section now correctly comes AFTER the param block.


# --- Status Mapping Logic ---
$statusMap = @{
    a = "after"
    b = "before"
    f = "fix"
}
# Defensive check: Ensure $statusInput is not null before using it.
if ($null -ne $statusInput -and $statusMap.ContainsKey($statusInput)) {
    $status = $statusMap[$statusInput]
} else {
    $status = $statusInput
}

# --- Path and Filename Configuration ---
# $PSScriptRoot is an automatic variable that contains the directory of the script.
$devRoot = (Get-Item (Join-Path $PSScriptRoot "..")).FullName
$screenshotDir = Join-Path -Path $devRoot -ChildPath "docs\dev-log\ui-checks"
$dateStamp = Get-Date -Format "yyyyMMdd"
$fileName = "$dateStamp-$topic-$status.png"
$fullPath = Join-Path -Path $screenshotDir -ChildPath $fileName

# --- Focus Activation Function ---
# Added -PassThru to Add-Type to avoid outputting the type info.
Add-Type -Name WindowManager -Namespace User32 -MemberDefinition @"
[DllImport("user32.dll")]
[return: MarshalAs(UnmanagedType.Bool)]
public static extern bool SetForegroundWindow(IntPtr hWnd);
"@ -ErrorAction SilentlyContinue -PassThru | Out-Null

# --- Core Logic ---

# 1. Ensure directory exists and create the placeholder file.
if (-not (Test-Path $screenshotDir)) {
    # Added -Force to create parent directories if they don't exist.
    New-Item -ItemType Directory -Path $screenshotDir -Force | Out-Null
}
$pngHeader = [System.Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
Set-Content -Path $fullPath -Value $pngHeader -Encoding Byte

# 2. Launch Snipping Tool.
Start-Process "ms-screenclip:"

# 3. Give user time to snip, then open and focus Paint.
Start-Sleep -Seconds 2
$paintProcess = Start-Process "mspaint.exe" -ArgumentList "$fullPath" -PassThru
Start-Sleep -Milliseconds 500

if ($null -ne $paintProcess -and $null -ne $paintProcess.MainWindowHandle) {
    [User32.WindowManager]::SetForegroundWindow($paintProcess.MainWindowHandle) | Out-Null
}

