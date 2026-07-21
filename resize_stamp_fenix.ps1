[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "anuncios"
$logoDest = Join-Path $basePath "logo_nexale_oficial.png"

# Caminhos do Anúncio Fênix
$slideCleanSource = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_ad_fenix_clean_1784150268891.png"
$destFile = Join-Path $folderDest "nexale_ad_fenix.png"

# Carrega a imagem limpa e o logo original
$original = [System.Drawing.Image]::FromFile($slideCleanSource)
$logo = [System.Drawing.Image]::FromFile($logoDest)

# Cria o canvas vertical de 1080x1350
$newImg = New-Object System.Drawing.Bitmap(1080, 1350)
$graphics = [System.Drawing.Graphics]::FromImage($newImg)

# Configura qualidade alta
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Preenche fundo (preto absoluto)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$graphics.FillRectangle($brush, 0, 0, 1080, 1350)

# Desenha o slide original centralizado
$graphics.DrawImage($original, 0, 135, 1080, 1080)

# Desenha o logotipo centralizado horizontalmente na parte inferior (Y = 1110)
$graphics.DrawImage($logo, 330, 1110, 65, 65)

# Escreve "NEXALE CRM"
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)

$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brushCyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 162, 232)) # Azul Celeste
$brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::LightGray)

$graphics.DrawString("NEXALE", $fontTitle, $brushWhite, 410, 1115)
$graphics.DrawString("CRM", $fontTitle, $brushCyan, 570, 1115)
$graphics.DrawString("seu crm de resultados", $fontSub, $brushGray, 412, 1160)

# Desenha o botão "TESTE GRÁTIS POR 14 DIAS" (Y = 1240)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(128, 0, 255), 2) # Borda Roxa
$graphics.DrawRectangle($pen, 340, 1240, 400, 50)

# Escreve o texto do botão centralizado
$fontBtn = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$graphics.DrawString("TESTE GRÁTIS POR 14 DIAS", $fontBtn, $brushWhite, 425, 1253)

# Libera os arquivos
$original.Dispose()
$logo.Dispose()
$graphics.Dispose()
$brush.Dispose()
$pen.Dispose()
$fontTitle.Dispose()
$fontSub.Dispose()
$fontBtn.Dispose()
$brushWhite.Dispose()
$brushCyan.Dispose()
$brushGray.Dispose()

# Salva a imagem vertical final
$tempPath = "$destFile.temp"
$newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

if (Test-Path $destFile) { Remove-Item $destFile -Force }
Rename-Item $tempPath "nexale_ad_fenix.png"

Write-Host "Criativo da Fênix verticalizado e logotipo aplicado com sucesso!"
