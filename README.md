# Conversão da Loja — aplicativo para Windows

Abre o sistema (o mesmo site de sempre) em uma janela própria, sem barra de endereço, abas ou menus.
O sistema, o login, o Supabase e o banco de dados NÃO mudam: o aplicativo só mostra o site.
Quando o site é atualizado, o aplicativo já abre a versão nova (não precisa instalar de novo).

## Como gerar o instalador (.exe), de graça, sem instalar nada no computador

1. Abra o arquivo `config.json` e troque o texto pelo endereço do sistema (o mesmo que você abre no navegador), começando com https://
   Exemplo: { "url": "https://conversao-loja.pages.dev" }
2. No GitHub, crie um repositório NOVO (privado), por exemplo `conversao-loja-desktop`.
3. Envie todo o conteúdo desta pasta (inclusive a pasta oculta `.github`). Não é o mesmo repositório do sistema.
4. No repositório, abra a aba **Actions**, escolha **Gerar instalador Windows** e clique em **Run workflow**.
   (Ele também roda sozinho quando você envia os arquivos.)
5. Espere uns 5 minutos. Abra a execução concluída (✓ verde) e, no fim da página, em **Artifacts**,
   baixe `instalador-windows`. Dentro do .zip está o `Instalador-Conversao-da-Loja-1.0.0.exe`.

## Instalar no computador da loja (Windows 10 ou 11)
1. Dê dois cliques no instalador. Se o Windows mostrar "O Windows protegeu seu computador",
   clique em **Mais informações** e depois em **Executar assim mesmo** (o instalador não é assinado digitalmente).
2. Avance até o fim. Ele cria o atalho **Conversão da Loja** na área de trabalho e no menu Iniciar.
3. Abra pelo atalho e entre com o e-mail e a senha de sempre.

## Quando precisa gerar de novo
Só se mudar o endereço do sistema ou o ícone. Mudanças no sistema não exigem novo instalador.

## Testar no seu computador (opcional, para quem programa)
npm install
npm start

## Se a janela abrir em branco
O aplicativo guarda um registro em `diagnostico.log` (aperte Ctrl+Shift+L dentro do aplicativo para abrir a pasta).
Se a janela travar ao abrir, ele reinicia sozinho em até 3 "modos de compatibilidade" (sem placa de vídeo, sem
proteção de código do renderizador, sem sandbox) e guarda o modo que funcionou. Isso pode levar uns 30 segundos na primeira vez.
