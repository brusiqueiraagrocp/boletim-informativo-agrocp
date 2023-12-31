﻿# boletim-informativo-agrocp
Documentação do Código

Requisitos e Bibliotecas

axios: Utilizado para fazer solicitações HTTP.

cheerio: Biblioteca para análise e manipulação de HTML.

nodemailer: Biblioteca para enviar e-mails.

rss-parser: Parser de RSS para leitura de feeds de notícias.

handlebars: Motor de templates para criar HTML a partir de modelos.

fs: Módulo de sistema de arquivos, usado para operações com arquivos.
date-fns/format: Função de formatação de datas.

Funções Principais
getMarketNews(url)

Descrição: Busca notícias de mercado a partir de um feed RSS.
Entrada: URL do feed RSS.
Saída: Array de notícias com título, link e data de publicação.
buscarPrevisaoTempo()

Descrição: Busca a previsão do tempo para uma localização específica.
Entrada: Nenhuma (usa latitude e longitude fixas).
Saída: Objeto com previsão atual, incluindo ícone do clima, temperaturas atual, mínima e máxima, e previsão para os próximos dias.
formatDate()

Descrição: Formata a data atual para o padrão brasileiro.
Saída: String da data formatada.
extrairNoticias(url)

Descrição: Extrai notícias de um site específico usando web scraping.
Entrada: URL do site de notícias.
Saída: Array de notícias com título, link e URL da imagem.
filtrarPorPalavrasChave(noticias, palavrasChave)

Descrição: Filtra um array de notícias por palavras-chave.
Entrada: Array de notícias e array de palavras-chave.
Saída: Array de notícias filtradas.
enviarEmail(destinatario, assunto, html)

Descrição: Envia um e-mail usando o nodemailer.
Entrada: E-mail do destinatário, assunto e conteúdo HTML do e-mail.
Saída: Nenhuma (envia um e-mail).
buscarCotacoes()

Descrição: Busca cotações de produtos agrícolas.
Saída: Objeto com cotações de café, soja e milho.
extrairCotacoes(url, produto)

Descrição: Extrai cotações de um produto específico de uma página web.
Entrada: URL da página de cotações e nome do produto.
Saída: Array de cotações para o produto especificado.
main()

Descrição: Função principal que orquestra a execução das outras funções, obtendo notícias, previsões do tempo, cotações e enviando um e-mail com um boletim informativo.
Comentários Adicionais
O script é estruturado de forma modular, com cada função desempenhando uma tarefa específica.
A função main serve como ponto de entrada do script, organizando o fluxo de execução das outras funções.
O código utiliza modernas práticas de JavaScript assíncrono, como async/await, para lidar com operações assíncronas como requisições HTTP e leitura de arquivos.
