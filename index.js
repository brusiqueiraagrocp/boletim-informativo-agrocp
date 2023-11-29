const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;

//Adicione no topo do seu arquivo
const apiKeyAccuWeather = '	DjHROZ2m0EasT2mugUGeiKcCk19ReDPE';

const iconesClimaticos = {
    "Ensolarado": "wi-day-sunny",
    "Parcialmente Nublado": "wi-day-cloudy",
    "Nublado": "wi-cloudy",
    "Chuva": "wi-rain",
    "Neve": "wi-snow",
    "Vento": "wi-windy",
    "Tempestade": "wi-thunderstorm"
};


async function buscarPrevisaoTempo(idCidade) {
    try {
        const url = `http://dataservice.accuweather.com/currentconditions/v1/${idCidade}?apikey=${apiKeyAccuWeather}&language=pt-BR&details=true`;
        const response = await axios.get(url);
        const dados = response.data[0];

        // Certifique-se de que os campos existem na resposta da API
        const temperatura = dados.Temperature?.Metric?.Value ?? 'N/A';
        const sensacao = dados.RealFeelTemperature?.Metric?.Value ?? 'N/A';
        const pressao = dados.Pressure?.Metric?.Value ?? 'N/A';

        const iconeClasse = iconesClimaticos[dados.WeatherText] || "wi-na";
        
        return {
            temperatura: temperatura + '°C',
            sensacao: sensacao + '°C',
            chovendo: dados.HasPrecipitation ? 'Sim' : 'Não',
            humidade: dados.RelativeHumidity + '%',
            vento: dados.Wind?.Speed?.Metric?.Value ? dados.Wind.Speed.Metric.Value + ' km/h' : 'N/A',
            pressao: pressao + ' hPa',
            iconeClasse: iconeClasse
        };
    } catch (error) {
        console.error(`Erro ao buscar previsão do tempo: ${error}`);
        return null;
    }
}



async function extrairNoticias(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const noticias = [];

        let seletorTitulo;
        let seletorLink;
      

        if (url.includes('g1.globo.com')) {
            seletorTitulo = 'p'; // Seletor do título para o G1
            seletorLink = '.feed-post-link'; // Seletor do link para o G1
            
        } else if (url.includes('canalrural.com.br')) {
            seletorTitulo = '.post-title-feed-xl, .post-title-feed-lg'; // Seletor do título para o Canal Rural
            seletorLink = '.feed-link'; // Seletor do link para o Canal Rural
            
        
        } else if (url.includes('globorural.globo.com/especiais/futuro-do-agro/')) {
           seletorTitulo = 'a.bstn-dedupe-url'; // Seletor do título para Globo Rural
            seletorLink = 'a.bstn-dedupe-url'

            }

        $(seletorLink).each((i, element) => {
            const titulo = $(element).find(seletorTitulo).text().trim();
            const link = $(element).attr('href');
           

            noticias.push({ titulo, link });
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
        service: 'gmail',
        auth: {
            user: 'siqueirabruno455@gmail.com',
            pass: 'xblo odqw itxy axlp'
        }
    });

    const mailOptions = {
        from: 'siqueirabruno455@gmail.com',
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
        const urlCotacoes = 'https://globorural.globo.com/cotacoes/';
        const response = await axios.get(urlCotacoes);
        const $ = cheerio.load(response.data);

        // Extrair a data da última cotação
        const dataUltimaCotacao = $('.cotacao__ultima-cotacao').text().trim();

        // Função auxiliar para extrair a cotação e variação de um produto específico
        const extrairCotacaoEVariação = (produto) => {
            const seletorProduto = $('.cotacao__produto').filter(function() {
                return $(this).text().trim() === produto;
            });

            const cotacao = seletorProduto.nextAll('.cotacao__valor').find('.cotacao__valor__conteudo').first().text().trim();
            const variacao = seletorProduto.nextAll('.cotacao__variacao').find('.cotacao__variacao__variado').text().trim();

            return { cotacao, variacao };
        };

        // Extrair as cotações e variações
        const cotacaoCafe = extrairCotacaoEVariação('Café');
        const cotacaoSoja = extrairCotacaoEVariação('Soja');
        const cotacaoMilho = extrairCotacaoEVariação('Milho');

        return {
            dataUltimaCotacao,
            cafe: cotacaoCafe,
            soja: cotacaoSoja,
            milho: cotacaoMilho
        };
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
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo, cotacoes: cotacoes });
    console.log(noticiasFiltradas, previsaoTempo);

    await enviarEmail('siqueirabruno455@gmail.com', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

