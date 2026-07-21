[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "anuncios"
$logoDest = Join-Path $basePath "logo_nexale_oficial.png"

# Caminhos do Anúncio Tigre
$slideCleanSource = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_ad_tigre_clean_1784238684812.png"
$destFile = Join-Path $folderDest "nexale_ad_tigre.png"

# Carrega a imagem limpa e o logo original
$original = [System.Drawing.Image]::FromFile($slideCleanSource)
$logo = [System.Drawing.Image]::FromFile($logoDest)

# Cria o canvas vertical de 1080x1350
$newImg = New-Object System.Drawing.Bitmap(1080, 1350)
$graphics = [System.Drawing.Graphics]::FromImage($newImg)

# Configura qualidade alta
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Preenche fundo (preto absoluto)
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$graphics.FillRectangle($brushBg, 0, 0, 1080, 1350)

# Desenha o slide original centralizado
$graphics.DrawImage($original, 0, 135, 1080, 1080)

# Cobre o texto gerado pela IA com uma caixa de degradê do próprio fundo (Y=715 a Y=925)
$bmpOriginal = New-Object System.Drawing.Bitmap($slideCleanSource)
$colorTop = $bmpOriginal.GetPixel(50, 580)
$colorBottom = $bmpOriginal.GetPixel(50, 780)
$bmpOriginal.Dispose()

$pointStart = New-Object System.Drawing.PointF(0, 715)
$pointEnd = New-Object System.Drawing.PointF(0, 925)
$brushCover = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pointStart, $pointEnd, $colorTop, $colorBottom)
$graphics.FillRectangle($brushCover, 50, 715, 980, 210)

# Definição das fontes
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$fontLogo = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$fontLogoSub = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$fontBtn = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)

# Definição dos Pincéis
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brushCyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 162, 232))
$brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 180, 180))

# Criação do Degradê Oficial para as letras
$pointTxtStart = New-Object System.Drawing.PointF(150, 0)
$pointTxtEnd = New-Object System.Drawing.PointF(930, 0)
$colorStart = [System.Drawing.Color]::FromArgb(0, 162, 232)
$colorEnd = [System.Drawing.Color]::FromArgb(128, 0, 255)
$brushGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pointTxtStart, $pointTxtEnd, $colorStart, $colorEnd)

$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center

# Construção segura dos acentos em Unicode
$txtBusque = "BUSQUE CLIENTES"
$txtRegiao = "POR REGI" + [char]0x00C3 + "O."
$txtSubLine = "Mapeie empresas por segmento e cidade com o Nexale CRM."
$txtBtn = "TESTE GR" + [char]0x00C1 + "TIS POR 14 DIAS"

# DESENHA OS TEXTOS CORRIGIDOS E CENTRALIZADOS (X = 540)
# Linha 1: RADAR DE PROSPECÇÃO B2B (com acentuação correta)
$txtRadar = "RADAR DE PROSPEC" + [char]0x00C7 + [char]0x00C3 + "O B2B"
$graphics.DrawString($txtRadar, $fontTitle, $brushWhite, 540, 720, $sfCenter)

# Linha 2: BUSQUE CLIENTES POR REGIÃO
$sizeBusque = $graphics.MeasureString("BUSQUE CLIENTES ", $fontTitle)
$sizeRegiao = $graphics.MeasureString($txtRegiao, $fontTitle)
$totalW = $sizeBusque.Width + $sizeRegiao.Width
$startX = 540 - ($totalW / 2)

$graphics.DrawString("BUSQUE CLIENTES ", $fontTitle, $brushWhite, $startX, 785)
$graphics.DrawString($txtRegiao, $fontTitle, $brushGradient, ($startX + $sizeBusque.Width - 10), 785)

# Subtexto centralizado
$graphics.DrawString($txtSubLine, $fontSub, $brushGray, 540, 930, $sfCenter)

# Desenha o logotipo oficial Nexale no rodapé (Y = 1110)
$graphics.DrawImage($logo, 330, 1110, 65, 65)

# Escreve o texto da logo
$graphics.DrawString("NEXALE", $fontLogo, $brushWhite, 410, 1115)
$graphics.DrawString("CRM", $fontLogo, $brushCyan, 570, 1115)
$graphics.DrawString("seu crm de resultados", $fontLogoSub, $brushGray, 412, 1160)

# Desenha o botão "TESTE GRÁTIS POR 14 DIAS" (Y = 1240)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(128, 0, 255), 2)
$graphics.DrawRectangle($pen, 340, 1240, 400, 50)
$graphics.DrawString($txtBtn, $fontBtn, $brushWhite, 425, 1253)

# Libera os arquivos
$original.Dispose()
$logo.Dispose()
$graphics.Dispose()
$brushBg.Dispose()
$brushCover.Dispose()
$brushWhite.Dispose()
$brushCyan.Dispose()
$brushGray.Dispose()
$brushGradient.Dispose()
$pen.Dispose()
$fontTitle.Dispose()
$fontSub.Dispose()
$fontLogo.Dispose()
$fontLogoSub.Dispose()
$fontBtn.Dispose()
$sfCenter.Dispose()

# Salva a imagem vertical final
$tempPath = "$destFile.temp"
$newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

if (Test-Path $destFile) { Remove-Item $destFile -Force }
Rename-Item $tempPath "nexale_ad_tigre.png"

Write-Host "Criativo do Tigre verticalizado com sucesso!"
