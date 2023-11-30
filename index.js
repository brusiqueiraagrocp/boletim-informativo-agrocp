const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const Parser = require('rss-parser');
const sharp = require('sharp');
const handlebars = require('handlebars');
const fs = require('fs').promises;


//Adicione no topo do seu arquivo
const apiKeyAccuWeather = '	DjHROZ2m0EasT2mugUGeiKcCk19ReDPE';

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
  
  // Exemplo de uso:
  const url = 'https://br.investing.com/rss/market_overview.rss'; // URL do feed RSS
  getMarketNews(url)
    .then((news) => {
      console.log('Notícias com imagens:', news);
    })
    .catch((err) => {
      console.error('Erro:', err);
    });



const iconesClimaticos = {
    "Ensolarado": "https://iili.io/JxP9qSp.png",
    "Parcialmente Nublado": "https://iili.io/JxP9nRI.png",
    "Nublado": "https://iili.io/JxP9KKv.png",
    "Chuva": "https://iili.io/JxP9CHN.png",
    "Neve": "https://iili.io/JxP9flR.png",
    "Vento": "https://iili.io/JxP9oNt.png",
    "Tempestade": "https://iili.io/JxP9xDX.png"
};


async function buscarPrevisaoTempo(idCidade) {
    try {
        const urlAtual = `http://dataservice.accuweather.com/currentconditions/v1/${idCidade}?apikey=${apiKeyAccuWeather}&language=pt-BR&details=true`;
        const responseAtual = await axios.get(urlAtual);
        const dadosAtual = responseAtual.data[0];

        const temperatura = dadosAtual.Temperature?.Metric?.Value ?? 'N/A';
        const sensacao = dadosAtual.RealFeelTemperature?.Metric?.Value ?? 'N/A';
        const pressao = dadosAtual.Pressure?.Metric?.Value ?? 'N/A';

        const iconeUrl = iconesClimaticos[dadosAtual.WeatherText] || "https://iili.io/JxPJ16b.png";

        // Busca pela previsão para os próximos 3 dias
        const urlPrevisao = `http://dataservice.accuweather.com/forecasts/v1/daily/3day/${idCidade}?apikey=${apiKeyAccuWeather}&language=pt-BR&details=true&metric=true`;
        const responsePrevisao = await axios.get(urlPrevisao);
        const previsaoDias = responsePrevisao.data.DailyForecasts.map(dia => ({
            minima: dia.Temperature.Minimum.Value + '°C',
            maxima: dia.Temperature.Maximum.Value + '°C',
            clima: dia.Day.IconPhrase
        }));

        return {
            temperaturaAtual: temperatura + '°C',
            sensacaoAtual: sensacao + '°C',
            chovendo: dadosAtual.HasPrecipitation ? 'Sim' : 'Não',
            humidade: dadosAtual.RelativeHumidity + '%',
            vento: dadosAtual.Wind?.Speed?.Metric?.Value ? dadosAtual.Wind.Speed.Metric.Value + ' km/h' : 'N/A',
            pressao: pressao + ' hPa',
            iconeUrl: iconeUrl,
            previsaoProximosDias: previsaoDias
        };
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
        const imagemPadrao = 'https://iili.io/JxPVGqB.png'; // URL da imagem padrão

        let seletorTitulo, seletorLink, seletorImagem;

        if (url.includes('g1.globo.com')) {
            seletorTitulo = 'p';
            seletorLink = '.feed-post-link';
            seletorImagem = '.bstn-fd-item-cover picture img'; // Seletor atualizado para imagens do G1
        } else if (url.includes('canalrural.com.br')) {
            seletorTitulo = '.post-title-feed-xl, .post-title-feed-lg';
            seletorLink = '.feed-link';
            seletorImagem = 'img'; // Seletor para a imagem no Canal Rural
        }

        $(seletorLink).each(async (i, element) => {
            const titulo = $(element).find(seletorTitulo).text().trim();
            const link = $(element).attr('href');
            let imagemUrl;

            if (url.includes('g1.globo.com')) {
                imagemUrl = $(element).closest('.feed-post').find(seletorImagem).attr('src');
            } else if (url.includes('canalrural.com.br')) {
                imagemUrl = $(element).find(seletorImagem).attr('data-src') || $(element).find(seletorImagem).attr('src');
            }

            // Se não encontrar a imagem, usa a imagem padrão
            if (!imagemUrl || imagemUrl.includes('data:image/svg+xml')) {
                imagemUrl = imagemPadrao;
            } else if (imagemUrl.endsWith('.svg')) {
                // Se a imagem for um SVG, converte para PNG
                const pngBuffer = await sharp(Buffer.from(data)).png().toBuffer();
                imagemUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
            }

            noticias.push({ titulo, link, imagem: imagemUrl });
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

async function extrairCotacoes(url, produto, intervaloInicio, intervaloFim) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        let cotacoes = [];
        $('table tr').each((index, element) => {
            if (index >= intervaloInicio && index <= intervaloFim) {
                const descricao = $(element).find('td:nth-child(1)').text().trim();
                const ultimo = $(element).find('td:nth-child(2)').text().trim();
                const diferenca = $(element).find('td:nth-child(3)').text().trim();
                const percentual = $(element).find('td:nth-child(4)').text().trim();

                cotacoes.push({ descricao, ultimo, diferenca, percentual });
            }
        });

        console.log(`${produto}:`, cotacoes);
        return cotacoes;
    } catch (error) {
        console.error(`Erro ao extrair cotações de ${produto}: ${error}`);
        return null;
    }
}

async function buscarCotacoes() {
    try {
        const url = 'https://bolsa.cocatrel.com.br/cotacao';

        // Ajuste os intervalos de índices conforme a estrutura da tabela na sua página
        const cotacoesCafe = await extrairCotacoes(url, 'Café', 1, 6);
        const cotacoesSoja = await extrairCotacoes(url, 'Soja', 7, 11);
        const cotacoesMilho = await extrairCotacoes(url, 'Milho', 12, 16);

        return { cotacoesCafe, cotacoesSoja, cotacoesMilho };
    } catch (error) {
        console.error(`Erro ao buscar cotações: ${error}`);
        return null;
    }
}


async function main() {
    const idCidadeTresPontas = '39227';

    const noticiasG1Agronegocios = await extrairNoticias('https://g1.globo.com/economia/agronegocios/');
    const noticiasSulDeMinas = await extrairNoticias('https://g1.globo.com/mg/sul-de-minas/ultimas-noticias/');
    const noticiasCanalRural = await extrairNoticias('https://www.canalrural.com.br/agricultura/');
    const noticiasFuturoAgro = await extrairNoticias('https://globorural.globo.com/especiais/futuro-do-agro/');
    const noticiasGloboRural = await extrairNoticias('https://globorural.globo.com/');

    const noticiasMercado = await getMarketNews('https://br.investing.com/rss/market_overview.rss');
    const cotacoes = await buscarCotacoes();


    const palavrasChave = [
        'café', 'soja', 'milho', 'agro', 'agronegócio',
        'trigo', 'cana-de-açúcar', 'pecuária', 'sustentabilidade',
        'exportação', 'mercado', 'tecnologia agrícola', 'política agrícola',
        'produção orgânica', 'fertilizantes', 'biotecnologia', 'irrigação',
        'segurança alimentar', 'comércio internacional', 'desenvolvimento rural', 'agrotóxico', 'Três Pontas',
        'Fertilizante', 'Fertilizantes', 'Adubo', 'Organomineral', 'Suíno', 'Equino', 'Bovino', 'Proteína', 'Santana da Vargem'
    ];
    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasFuturoAgro, ...noticiasSulDeMinas, ...noticiasCanalRural, ...noticiasGloboRural], palavrasChave);

    const previsaoTempo = await buscarPrevisaoTempo(idCidadeTresPontas);

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo, cotacoes: cotacoes, noticiasMercado: noticiasMercado });
    console.log(noticiasFiltradas, previsaoTempo);

    await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

