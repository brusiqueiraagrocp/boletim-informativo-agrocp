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





async function buscarPrevisaoTempo() {
    try {
        const url = 'https://bolsa.cocatrel.com.br/climatempo';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const previsaoTempo = [];

        $('h6').each((i, element) => {
            const tituloCondicao = $(element).text().trim();
            const imagemUrl = $(element).find('img').attr('src'); // Use .find em vez de .next
        
            if (tituloCondicao && imagemUrl) {
                previsaoTempo.push({ tituloCondicao, imagemUrl });
            }
            
        });

        

        return previsaoTempo;
    } catch (error) {
        console.error(`Erro ao buscar previsão do tempo: ${error}`);
        return null;
    }
}


// Usar a função e imprimir os resultados
//buscarPrevisaoTempo().then(data => console.log(data));


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



async function buscarCotacoes() {
    try {
        const url = 'https://bolsa.cocatrel.com.br/';

        // Índices atualizados conforme a nova estrutura da tabela
        // Segundo elemento para descrição, sexto para fechamento e sétimo para fechamento anterior
        const indiceDescricao = 2;
        const indiceFechamento = 6;
        const indiceFechamentoAnterior = 7;

        const cotacoesCafe = await extrairCotacoes(url, 'Café', indiceDescricao, indiceFechamentoAnterior);
        const cotacoesSoja = await extrairCotacoes(url, 'Soja', indiceDescricao, indiceFechamentoAnterior);
        const cotacoesMilho = await extrairCotacoes(url, 'Milho', indiceDescricao, indiceFechamentoAnterior);

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

        let cotacao = null;
        let encontrouProduto = false;

        $('table tr').each((index, element) => {
            // Verifica se a linha corresponde ao cabeçalho do produto
            if ($(element).text().includes(produto)) {
                encontrouProduto = true;
            }

            // Se encontrou o produto e está na primeira linha de dados
            if (encontrouProduto && $(element).find('td').length > 1) {
                const descricao = $(element).find('td:nth-child(2)').text().trim(); // Descrição
                const fechamento = $(element).find('td:nth-child(6)').text().trim(); // Fechamento
                const fechamentoAnterior = $(element).find('td:nth-child(7)').text().trim(); // Fechamento anterior
                cotacao = { descricao, fechamento, fechamentoAnterior };
                return false; // Sair do loop
            }
        });

        console.log(`${produto}:`, cotacao);
        return cotacao;
    } catch (error) {
        console.error(`Erro ao extrair cotações de ${produto}: ${error}`);
        return null;
    }
}




async function main() {
    //const idCidadeTresPontas = '39227';

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

    const previsaoTempo = await buscarPrevisaoTempo();

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo, cotacoes: cotacoes, noticiasMercado: noticiasMercado });
    console.log(noticiasFiltradas, previsaoTempo);

    await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

