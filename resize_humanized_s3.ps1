[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "post humanizado"

$sourceFile = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_humanizado_s3_1783884907685.png"
$destFile = Join-Path $folderDest "nexale_humanizado_s3.png"

Write-Host "Processando Slide 3 em Largura Total (4:5)..."

# Copia a imagem original
Copy-Item -Path $sourceFile -Destination $destFile -Force

# Carrega e redimensiona para 1080x1350 vertical
$original = [System.Drawing.Image]::FromFile($destFile)
$newImg = New-Object System.Drawing.Bitmap(1080, 1350)
$graphics = [System.Drawing.Graphics]::FromImage($newImg)

# Obtém a cor de fundo
$bmpOriginal = New-Object System.Drawing.Bitmap($destFile)
$bgColor = $bmpOriginal.GetPixel(5, 5)
$bmpOriginal.Dispose()

# Preenche fundo e centraliza largura total
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$graphics.FillRectangle($brush, 0, 0, 1080, 1350)
$graphics.DrawImage($original, 0, 135, 1080, 1080)

$original.Dispose()
$graphics.Dispose()
$brush.Dispose()

# Salva por cima
$tempPath = "$destFile.temp"
$newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

Remove-Item $destFile -Force
Rename-Item $tempPath "nexale_humanizado_s3.png"

Write-Host "Slide 3 verticalizado com sucesso!"
