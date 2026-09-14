$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$brandRoot = Split-Path -Parent $PSScriptRoot
$brandImage = [System.Drawing.Image]::FromFile((Join-Path $brandRoot 'assets\branding\marginalia-logo.png'))
$brandOutput = Join-Path $brandRoot 'src-tauri\installer'
New-Item -ItemType Directory -Path $brandOutput -Force | Out-Null
$brandInk = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#2b2926'))
$brandMuted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#726b62'))
$brandPaper = [System.Drawing.ColorTranslator]::FromHtml('#f6f2ec')
$brandCenter = [System.Drawing.StringFormat]::new()
$brandCenter.Alignment = [System.Drawing.StringAlignment]::Center
$brandCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

# NSIS requires 24-bit BMPs at these dimensions. This only lays out the
# generated logo and installer typography; the master artwork stays intact.
function Write-InstallerArt([string]$Name, [int]$Width, [int]$Height, [bool]$Sidebar) {
  $canvas = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $drawing = [System.Drawing.Graphics]::FromImage($canvas)
  $font = $null
  $caption = $null
  try {
    $drawing.Clear($brandPaper)
    $drawing.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $drawing.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $drawing.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    if ($Sidebar) {
      $drawing.DrawImage($brandImage, 20, 47, 124, 124)
      $font = [System.Drawing.Font]::new('Georgia', 16, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
      $caption = [System.Drawing.Font]::new('Segoe UI', 11, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
      $drawing.DrawString('Marginalia', $font, $brandInk, [System.Drawing.RectangleF]::new(4, 186, 156, 30), $brandCenter)
      $drawing.DrawString("A quieter place`nto write.", $caption, $brandMuted, [System.Drawing.RectangleF]::new(10, 219, 144, 40), $brandCenter)
    } else {
      $drawing.DrawImage($brandImage, 2, 4, 49, 49)
      $font = [System.Drawing.Font]::new('Georgia', 14, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
      $drawing.DrawString('Marginalia', $font, $brandInk, [System.Drawing.RectangleF]::new(51, 0, 99, 57), $brandCenter)
    }
    $canvas.Save((Join-Path $brandOutput $Name), [System.Drawing.Imaging.ImageFormat]::Bmp)
  } finally {
    if ($font) { $font.Dispose() }
    if ($caption) { $caption.Dispose() }
    $drawing.Dispose()
    $canvas.Dispose()
  }
}

try {
  Write-InstallerArt 'sidebar.bmp' 164 314 $true
  Write-InstallerArt 'header.bmp' 150 57 $false
} finally {
  $brandImage.Dispose()
  $brandInk.Dispose()
  $brandMuted.Dispose()
  $brandCenter.Dispose()
}
