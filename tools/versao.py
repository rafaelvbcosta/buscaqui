"""Troca o número de versão dos arquivos do site (para o navegador baixar a versão nova).

Uso (o Claude roda antes de cada publicação):  python3 tools/versao.py
Não é uma etapa de build: o site continua funcionando sem rodar este arquivo.
Ele só atualiza o "?v=..." nos imports de js/, no css e no script do index.html.
"""
import pathlib, re, datetime

v = datetime.datetime.now().strftime('%Y%m%d%H%M')
raiz = pathlib.Path(__file__).resolve().parent.parent
arquivos = [raiz / 'index.html', *sorted((raiz / 'js').rglob('*.js'))]
padrao_import = re.compile(r"""(from\s+['"])(\.{1,2}/[^'"?]+\.js)(\?v=[^'"]*)?(['"])""")
padrao_html = re.compile(r"""((?:src|href)=")((?:js/app\.js)|(?:css/styles\.css))(\?v=[^"]*)?(")""")
for f in arquivos:
    t = f.read_text(encoding='utf-8')
    novo = padrao_import.sub(lambda m: f"{m[1]}{m[2]}?v={v}{m[4]}", t)
    novo = padrao_html.sub(lambda m: f"{m[1]}{m[2]}?v={v}{m[4]}", novo)
    if novo != t:
        f.write_text(novo, encoding='utf-8')
print('versão', v)
