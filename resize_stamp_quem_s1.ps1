[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "post quem e nexale"
$logoDest = Join-Path $basePath "logo_nexale_oficial.png"

# Cria a pasta do post se não existir
if (-not (Test-Path $folderDest)) {
    New-Item -ItemType Directory -Path $folderDest -Force | Out-Null
    Write-Host "Pasta criada: $folderDest"
}

# Caminhos do Slide 1 Novo
$slideCleanSource = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_quem_s1_style_clean_1783901643058.png"
$destFile = Join-Path $folderDest "nexale_quem_s1.png"

# Carrega a imagem limpa e o logo original
$original = [System.Drawing.Image]::FromFile($slideCleanSource)
$logo = [System.Drawing.Image]::FromFile($logoDest)

# Cria o canvas vertical de 1080x1350
$newImg = New-Object System.Drawing.Bitmap(1080, 1350)
$graphics = [System.Drawing.Graphics]::FromImage($newImg)

# Configura qualidade alta
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Obtém a cor de fundo
$bmpOriginal = New-Object System.Drawing.Bitmap($slideCleanSource)
$bgColor = $bmpOriginal.GetPixel(5, 5)
$bmpOriginal.Dispose()

# Preenche fundo
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$graphics.FillRectangle($brush, 0, 0, 1080, 1350)

# Desenha o slide original centralizado
$graphics.DrawImage($original, 0, 135, 1080, 1080)

# Estampa o logo oficial da Nexale (tamanho 55x55 no canto SUPERIOR direito)
$graphics.DrawImage($logo, 800, 80, 55, 55)

# Escreve "nexale" ao lado do logo
$font = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
$fontBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(12, 33, 62))
$graphics.DrawString("nexale", $font, $fontBrush, 860, 86)

# Libera os arquivos
$original.Dispose()
$logo.Dispose()
$graphics.Dispose()
$brush.Dispose()
$font.Dispose()
$fontBrush.Dispose()

# Salva a imagem vertical final
$tempPath = "$destFile.temp"
$newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

if (Test-Path $destFile) { Remove-Item $destFile -Force }
Rename-Item $tempPath "nexale_quem_s1.png"

Write-Host "Capa do Carrossel Quem é a Nexale verticalizada e com o logotipo oficial aplicado!"
