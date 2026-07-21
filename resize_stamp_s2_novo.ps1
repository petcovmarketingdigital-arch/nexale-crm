[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "post humanizado"
$logoDest = Join-Path $basePath "logo_nexale_oficial.png"

# Caminhos do Slide 2 Novo
$slideCleanSource = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_post1_s2_novo_clean_1783894836761.png"
$destFile = Join-Path $folderDest "nexale_humanizado_s2.png"

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
Rename-Item $tempPath "nexale_humanizado_s2.png"

Write-Host "Slide 2 Novo verticalizado e logotipo oficial estampado no canto superior direito com sucesso!"
