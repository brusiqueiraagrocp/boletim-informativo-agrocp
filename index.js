// Importando bibliotecas necessárias
const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const Parser = require('rss-parser');
//const sharp = require('sharp');
const handlebars = require('handlebars');
const fs = require('fs').promises;
//const path = require('path');
//const sanitize = require('sanitize-filename');
const { format } = require('date-fns');


// Instância do parser de RSS
const parser = new Parser();

// Função para obter notícias do mercado a partir de um feed RSS
async function getMarketNews(url) {
    try {
        const feed = await parser.parseURL(url);

        const news = feed.items.map(item => ({
            titulo: item.title,
            link: item.link,
            dataPublicacao: item.pubDate // ou item.isoDate, dependendo da estrutura do feed RSS
        }));

        return news;
    } catch (error) {
        console.error('Erro ao obter notícias:', error.message);
        return [];
    }
}

// Função para buscar a previsão do tempo usando a API do OpenWeatherMap
async function buscarPrevisaoTempo() {
    try {
         // Coordenadas geográficas e chave da API
        const latitude = -21.3393;
        const longitude = -45.4243;
        const apiKey = 'a5f2bff3e3628b96b5250aee6e0e8121';
        
        // Mapeamento de ícones climáticos para diferentes condições do tempo
        const iconesClimaticos = {
            "Clear": "https://iili.io/JzTxOXa.png", // Ensolarado
            "Clouds": "https://iili.io/JzTxjmF.png", // Nublado
            "Rain": "https://iili.io/JzTxhe1.png", // Chuva
            "Snow": "https://iili.io/JzTxNzg.png", // Neve
            "Windy": "https://iili.io/JzTxeLJ.png", // Vento
            "Storm": "https://iili.io/JzTxvqv.png", // Tempestade
            
        };
        
        // Construção da URL da API e realização da requisição
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=pt_br`;
        const response = await axios.get(url);
        const previsao = response.data;

         // Processamento dos dados recebidos para extrair a previsão atual e dos próximos dias
        let minimaDiaria = Number.MAX_VALUE;
        let maximaDiaria = Number.MIN_VALUE;
        previsao.list.forEach(item => {
            if (item.main.temp_min < minimaDiaria) {
                minimaDiaria = item.main.temp_min;
            }
            if (item.main.temp_max > maximaDiaria) {
                maximaDiaria = item.main.temp_max;
            }
        });

        const previsaoAtual = {
            iconeUrl: iconesClimaticos[previsao.list[0].weather[0].main] || 'https://iili.io/JzTzFBj.png',
            temperaturaAtual: previsao.list[0].main.temp,
            temperaturaMinima: minimaDiaria,
            temperaturaMaxima: maximaDiaria,
            probabilidadeChuva: previsao.list[0].pop,
            previsaoProximosDias: previsao.list.slice(1, 8).map(item => ({
                data: format(new Date(item.dt_txt), 'dd/MM HH:mm'),
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
// Função para formatar a data atual no formato brasileiro
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

// Função para extrair notícias usando web scraping
async function extrairNoticias(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        // Seletores e lógica para extrair informações das notícias do site
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
            seletorImagem = '.bstn-fd-item-cover picture img'; 
        } else if (url.includes('canalrural.com.br')) {
            seletorTitulo = '.post-title-feed-xl, .post-title-feed-lg';
            seletorLink = '.feed-link';
            seletorImagem = 'figure.feed-figure.hover-overlay img'; 
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
      // Retorna um array de objetos de notícias
      return noticias;
  } catch (error) {
      console.error(`Erro ao extrair notícias de ${url}:`, error);
      return [];
  }
}

// Função para filtrar notícias com base em palavras-chave
function filtrarPorPalavrasChave(noticias, palavrasChave) {
    // Implementação da filtragem usando expressões regulares
    console.log("Palavras-chave:", palavrasChave);

    return noticias.filter(noticia => {
        return palavrasChave.some(palavraChave => {
            const regex = new RegExp('\\b' + palavraChave + '\\b', 'i'); // Cria uma regex para a palavra-chave
            return regex.test(noticia.titulo);
        });
    });
}

// Função para enviar e-mails
async function enviarEmail(destinatario, assunto, html) {
    // Configuração do transporte e opções de e-mail
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

// Função para buscar cotações de produtos agrícolas
async function buscarCotacoes() {
    try {
        // Função para buscar cotações de produtos agrícolas
        const url = 'https://bolsa.cocatrel.com.br/';
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

// Função para extrair cotações de um produto específico
async function extrairCotacoes(url, produto) {
    try {
        // Implementação da lógica de extração de cotações
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
// Função principal que coordena todas as operações
async function main() {
    // Obtenção de notícias, cotações e previsão do tempo
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

    // Filtragem de notícias, preparação e envio do e-mail
    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasFuturoAgro, ...noticiasSulDeMinas, ...noticiasCanalRural, ...noticiasGloboRural], palavrasChave);

    const previsaoTempo = await buscarPrevisaoTempo();

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo, cotacoes: cotacoes, noticiasMercado: noticiasMercado, dataAtual: dataAtual });


    await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

// Execução da função principal
main();

