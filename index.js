const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const Parser = require('rss-parser');
//const sharp = require('sharp');
const handlebars = require('handlebars');
const fs = require('fs').promises;
//const path = require('path');
//const sanitize = require('sanitize-filename');



const parser = new Parser();

async function getMarketNews(url) {
    try {
        const feed = await parser.parseURL(url);

        const newsPromises = feed.items.map(async (item) => {
            // Função para obter a URL da imagem a partir do HTML da página do artigo
            async function getImageUrl(articleUrl) {
                try {
                    const response = await axios.get(articleUrl);
                    const $ = cheerio.load(response.data);
                    // Encontre a tag de imagem e obtenha o valor do atributo "src"
                    const imageUrl = $('img').attr('src');
                    return imageUrl;
                } catch (error) {
                    console.error('Erro ao obter a imagem:', error.message);
                    return null;
                }
            }

            const imageUrl = await getImageUrl(item.link);

            return {
                titulo: item.title,
                descricao: item.contentSnippet,
                link: item.link,
                imagem: imageUrl,
            };
        });

        // Aguarde todas as promessas de obtenção das notícias e imagens
        const newsWithImages = await Promise.all(newsPromises);

        return newsWithImages;
    } catch (error) {
        console.error('Erro ao obter notícias:', error.message);
        return [];
    }
}

async function buscarPrevisaoTempo() {
    try {
        const latitude = -21.3393; // Substitua pela latitude desejada
        const longitude = -45.4243; // Substitua pela longitude desejada
        const apiKey = 'a5f2bff3e3628b96b5250aee6e0e8121'; // Substitua pela sua chave da API do OpenWeatherMap

        const iconesClimaticos = {
            "Clear": "https://iili.io/JzTxOXa.png", // Ensolarado
            "Clouds": "https://iili.io/JzTxjmF.png", // Nublado
            "Rain": "https://iili.io/JzTxhe1.png", // Chuva
            "Snow": "https://iili.io/JzTxNzg.png", // Neve
            "Windy": "https://iili.io/JzTxeLJ.png", // Vento
            "Storm": "https://iili.io/JzTxvqv.png", // Tempestade
            // Adicione mais condições conforme necessário
        };

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=pt_br`;
        const response = await axios.get(url);
        const previsao = response.data;

        const condicaoClimaticaAtual = previsao.list[0].weather[0].main;
        const iconeUrl = iconesClimaticos[condicaoClimaticaAtual] || 'https://iili.io/JzTzFBj.png'; // URL do ícone padrão para condições não mapeadas

        const previsaoAtual = {
            iconeUrl: iconeUrl,
            temperaturaAtual: previsao.list[0].main.temp,
            temperaturaMinima: previsao.list[0].main.temp_min,
            temperaturaMaxima: previsao.list[0].main.temp_max,
            probabilidadeChuva: previsao.list[0].pop, // valor de 0 a 1
            previsaoProximosDias: previsao.list.slice(1, 8).map(item => ({
                data: item.dt_txt,
                minima: item.main.temp_min,
                maxima: item.main.temp_max,
                probabilidadeChuva: item.pop
            }))
        };
        console.log(previsaoAtual);
        return previsaoAtual;
    } catch (error) {
        console.error(`Erro ao buscar previsão do tempo: ${error}`);
        return null;
    }
}

const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
const dataAtual = formatDate();

async function extrairNoticias(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const noticias = [];
        const imagemPadraoG1 = 'https://iili.io/JzulwDx.png'; // URL da imagem padrão
        const imagemPadraoCanalRural = 'https://iili.io/JzulhAb.png';
        const imagemPadraoGloboRural = 'https://iili.io/JzuljNj.jpg';

        let seletorTitulo, seletorLink, seletorImagem;

        if (url.includes('globorural.globo.com')) {
            seletorTitulo = '.feed-post-link';
            seletorLink = 'h2.feed-post-link a';
            seletorImagem = 'img.bstn-fd-picture-image';
        } else if (url.includes('g1.globo.com')) {
            seletorTitulo = 'p';
            seletorLink = '.feed-post-link';
            seletorImagem = '.bstn-fd-item-cover picture img'; // Seletor atualizado para imagens do G1
        } else if (url.includes('canalrural.com.br')) {
            seletorTitulo = '.post-title-feed-xl, .post-title-feed-lg';
            seletorLink = '.feed-link';
            seletorImagem = 'figure.feed-figure.hover-overlay img'; // Seletor para a imagem no Canal Rural
        }

        $(seletorLink).each((i, element) => {
          let titulo;
          if (url.includes('canalrural.com.br')) {
              titulo = $(element).find(seletorTitulo).text().trim(); // Extrai o título com o seletor específico do Canal Rural
          } else {
              titulo = $(element).text().trim(); // Para os outros sites
          }
  
          const link = $(element).attr('href');
              
          
          let imagemUrl;
  

            if (url.includes('globorural.globo.com')) {
                imagemUrl = $(element).closest('.feed-post-body').find(seletorImagem).attr('src') || imagemPadraoGloboRural;
            } else if (url.includes('g1.globo.com')) {
                imagemUrl = $(element).closest('.feed-post').find(seletorImagem).attr('src') || imagemPadraoG1;
            } else if (url.includes('canalrural.com.br')) {
                imagemUrl = $(element).closest('.feed-post').find(seletorImagem).attr('src') || imagemPadraoCanalRural;
            }

            

          // Adiciona a notícia com a URL da imagem
          noticias.push({ titulo, link, imagem: imagemUrl});
      });

      console.log(noticias);
      return noticias;
  } catch (error) {
      console.error(`Erro ao extrair notícias de ${url}:`, error);
      return [];
  }
}

function filtrarPorPalavrasChave(noticias, palavrasChave) {
    console.log("Palavras-chave:", palavrasChave);

    return noticias.filter(noticia => {
        return palavrasChave.some(palavraChave => {
            const regex = new RegExp('\\b' + palavraChave + '\\b', 'i'); // Cria uma regex para a palavra-chave
            return regex.test(noticia.titulo);
        });
    });
}

async function enviarEmail(destinatario, assunto, html) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
            user: 'no-reply@agrocp.agr.br',
            pass: 'slflsfmghcnlgnfx'
        }
    });

    const mailOptions = {
        from: 'no-reply@agrocp.agr.br',
        to: destinatario,
        subject: assunto,
        html: html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail enviado com sucesso!');
    } catch (error) {
        console.error(`Erro ao enviar e-mail: ${error}`);
    }
}

async function buscarCotacoes() {
    try {
        const url = 'https://bolsa.cocatrel.com.br/';

        // Índices atualizados conforme a nova estrutura da tabela
        // Segundo elemento para descrição, sexto para fechamento e sétimo para fechamento anterior
        const indiceDescricao = 0;
        const indiceFechamento = 6;
        const indiceFechamentoAnterior = 7;

        const cotacoesCafe = await extrairCotacoes(url, 'Café', indiceDescricao, indiceFechamento, indiceFechamentoAnterior);
        const cotacoesSoja = await extrairCotacoes(url, 'Soja', indiceDescricao, indiceFechamento, indiceFechamentoAnterior);
        const cotacoesMilho = await extrairCotacoes(url, 'Milho', indiceDescricao, indiceFechamento, indiceFechamentoAnterior);

        console.log(cotacoesCafe);
        console.log(cotacoesMilho);
        console.log(cotacoesSoja);

        return { cotacoesCafe, cotacoesSoja, cotacoesMilho };
    } catch (error) {
        console.error(`Erro ao buscar cotações: ${error}`);
        return null;
    }
}

async function extrairCotacoes(url, produto) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        let cotacoes = [];
        let encontrouProduto = false;
        const iconUp = 'https://iili.io/JzYQ2fe.png';
        const iconDown = 'https://iili.io/JzYQJs9.png';
        
        $('table tr').each((index, element) => {
            const textoLinha = $(element).text();

            // Verifica se a linha corresponde ao cabeçalho do produto e marca o início das cotações do produto
            if (textoLinha.includes(produto) && !encontrouProduto) {
                encontrouProduto = true;
            }
            // Se encontrou o cabeçalho de outro produto, marca o fim das cotações do produto
            else if (!textoLinha.includes(produto) && encontrouProduto && $(element).find('td').length <= 1) {
                return false; // Encerra o loop
            }

            // Se encontrou o produto e está em uma linha de dados
            if (encontrouProduto && $(element).find('td').length > 1) {
                const descricao = $(element).find('td:nth-child(2)').text().trim();
                const fechamento = parseFloat($(element).find('td:nth-child(6)').text().trim().replace(',', '.'));
                const fechamentoAnterior = parseFloat($(element).find('td:nth-child(7)').text().trim().replace(',', '.'));

                if (!isNaN(fechamento) && !isNaN(fechamentoAnterior)) {
                    let iconClass = fechamento > fechamentoAnterior ? iconUp : (fechamento < fechamentoAnterior ? iconDown : '');

                    cotacoes.push({ descricao, fechamento, fechamentoAnterior, iconClass });
                }
            }
        });

        console.log(`${produto}:`, cotacoes);
        return cotacoes;
    } catch (error) {
        console.error(`Erro ao extrair cotações de ${produto}: ${error}`);
        return null;
    }
}

async function main() {


    const noticiasG1Agronegocios = await extrairNoticias('https://g1.globo.com/economia/agronegocios/');
    const noticiasSulDeMinas = await extrairNoticias('https://g1.globo.com/mg/sul-de-minas/ultimas-noticias/');
    const noticiasCanalRural = await extrairNoticias('https://www.canalrural.com.br/agricultura/');
    const noticiasFuturoAgro = await extrairNoticias('https://globorural.globo.com/especiais/futuro-do-agro/');
    const noticiasGloboRural = await extrairNoticias('https://globorural.globo.com/ultimas-noticias');

    const noticiasMercado = await getMarketNews('https://br.investing.com/rss/market_overview.rss');
    const cotacoes = await buscarCotacoes();


    const palavrasChave = [
        'café', 'soja', 'milho', 'agro', 'agronegócio', 'gado', 'leite',
        'trigo', 'cana-de-açúcar', 'pecuária', 'sustentabilidade',
        'tecnologia agrícola', 'política agrícola', 'produção orgânica',
        'biotecnologia', 'irrigação', 'segurança alimentar',
        'comércio internacional', 'desenvolvimento rural', 'agrotóxico',
        'Três Pontas', 'fertilizantes', 'adubos', 'organomineral',
        'suíno', 'equino', 'bovino', 'proteína animal', 'cultivo sustentável',
        'agricultura de precisão', 'energia renovável no campo',
        'gestão agrícola', 'mercado agrícola', 'exportação agrícola',
        'inovação no campo', 'políticas de subsídio', 'agricultura familiar',
        'seguro rural', 'tecnologias verdes', 'agroecologia',
        'conservação do solo', 'manejo de pragas', 'melhoramento genético'
    ];

    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasFuturoAgro, ...noticiasSulDeMinas, ...noticiasCanalRural, ...noticiasGloboRural], palavrasChave);

    const previsaoTempo = await buscarPrevisaoTempo();

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo, cotacoes: cotacoes, noticiasMercado: noticiasMercado, dataAtual: dataAtual });


    await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

