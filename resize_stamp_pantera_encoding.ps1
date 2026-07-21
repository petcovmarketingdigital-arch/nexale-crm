[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$basePath = Resolve-Path "$env:USERPROFILE\OneDrive\*\NEXALECRM\imagens" | Select-Object -ExpandProperty Path
$folderDest = Join-Path $basePath "anuncios"
$logoDest = Join-Path $basePath "logo_nexale_oficial.png"

# Caminhos do Anúncio Pantera
$slideCleanSource = "C:\Users\petco\.gemini\antigravity\brain\141fcf34-06af-44b2-8b00-5172f04df754\nexale_ad_pantera_no_text_1784150994431.png"
$destFile = Join-Path $folderDest "nexale_ad_pantera.png"

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

# Definição das fontes
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 34, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$fontLogo = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
$fontLogoSub = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$fontBtn = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)

# Definição dos Pincéis
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$brushCyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 162, 232))
$brushGray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 180, 180))

# Criação do Degradê Oficial para as letras
$pointStart = New-Object System.Drawing.PointF(80, 0)
$pointEnd = New-Object System.Drawing.PointF(800, 0)
$colorStart = [System.Drawing.Color]::FromArgb(0, 162, 232)
$colorEnd = [System.Drawing.Color]::FromArgb(128, 0, 255)
$brushGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pointStart, $pointEnd, $colorStart, $colorEnd)

# CONSTRUÇÃO SEGURA DOS TEXTOS COM ACENTOS EM UNICODE
# "NÃO DEIXE NENHUM" -> N + Ã (0x00C3) + O DEIXE NENHUM
$txtNaoDeixe = "N" + [char]0x00C3 + "O DEIXE NENHUM"

# "Seja rápido e recupere o controle..." -> Seja r + á (0x00E1) + pido...
$txtSub = "Seja r" + [char]0x00E1 + "pido e recupere o controle das suas vendas no WhatsApp."

# "TESTE GRÁTIS POR 14 DIAS" -> TESTE GR + Á (0x00C1) + TIS...
$txtBtn = "TESTE GR" + [char]0x00C1 + "TIS POR 14 DIAS"

# DESENHA OS TEXTOS DO CORPO DO ANÚNCIO
# Linha 1: ABOCANHE O MERCADO,
$graphics.DrawString("ABOCANHE O MERCADO,", $fontTitle, $brushGradient, 80, 770)

# Linha 2: NÃO DEIXE NENHUM (com acento corrigido)
$graphics.DrawString($txtNaoDeixe, $fontTitle, $brushGradient, 80, 835)

# Linha 3: CLIENTE ESCAPAR.
$graphics.DrawString("CLIENTE ESCAPAR.", $fontTitle, $brushWhite, 80, 900)

# Subtexto (com acento corrigido)
$graphics.DrawString($txtSub, $fontSub, $brushGray, 82, 980)

# Desenha o logotipo centralizado (Y = 1110)
$graphics.DrawImage($logo, 330, 1110, 65, 65)

# Escreve "NEXALE CRM"
$graphics.DrawString("NEXALE", $fontLogo, $brushWhite, 410, 1115)
$graphics.DrawString("CRM", $fontLogo, $brushCyan, 570, 1115)
$graphics.DrawString("seu crm de resultados", $fontLogoSub, $brushGray, 412, 1160)

# Desenha o botão de CTA com texto corrigido (Y = 1240)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(128, 0, 255), 2)
$graphics.DrawRectangle($pen, 340, 1240, 400, 50)
$graphics.DrawString($txtBtn, $fontBtn, $brushWhite, 425, 1253)

# Libera os arquivos
$original.Dispose()
$logo.Dispose()
$graphics.Dispose()
$brushBg.Dispose()
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

# Salva a imagem
$tempPath = "$destFile.temp"
$newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Dispose()

if (Test-Path $destFile) { Remove-Item $destFile -Force }
Rename-Item $tempPath "nexale_ad_pantera.png"

Write-Host "Criativo da Pantera verticalizado com codificação corrigida com sucesso!"
