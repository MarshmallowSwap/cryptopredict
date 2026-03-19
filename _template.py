# Template helper per generare le pagine

NAV_INCLUDE = open('/home/claude/cryptopredict/_nav.html').read()

def page(title, data_page, content, extra_head=''):
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — CryptoPredict</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="_shared.css">
{extra_head}
</head>
<body data-page="{data_page}">
{NAV_INCLUDE}
<div class="page-wrap">
{content}
</div>
<script src="_shared.js"></script>
</body>
</html>"""

print("Template OK")
