const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;

//Adicione no topo do seu arquivo
const apiKeyAccuWeather = '	DjHROZ2m0EasT2mugUGeiKcCk19ReDPE';

const iconesClimaticos = {
    "Ensolarado": "https://ibb.co/FmNdV6w",
    "Parcialmente Nublado": "https://ibb.co/bKwRJ38",
    "Nublado": "https://ibb.co/KNNDhhk",
    "Chuva": "https://ibb.co/R3yPMhb",
    "Neve": "https://ibb.co/Bqr2DBj",
    "Vento": "https://ibb.co/NFrfYFL",
    "Tempestade": "https://ibb.co/gj0PQm0"
};


async function buscarPrevisaoTempo(idCidade) {
    try {
        const url = `http://dataservice.accuweather.com/currentconditions/v1/${idCidade}?apikey=${apiKeyAccuWeather}&language=pt-BR&details=true`;
        const response = await axios.get(url);
        const dados = response.data[0];
        const iconeUrl = iconesClimaticos[dados.WeatherText] || "https://cdn-icons-png.flaticon.com/128/1503/1503692.png";
        
        return {
            temperatura: dados.Temperature.Metric.Value + '°C',
            chovendo: dados.HasPrecipitation ? 'Sim' : 'Não',
            humidade: dados.RelativeHumidity + '%',
            vento: dados.Wind.Speed.Metric.Value + ' m/s', // Adicione a velocidade do vento
            condicaoClimatica: dados.WeatherText,
            iconeUrl
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
        let seletorConteudo; // Adicione um seletor para o conteúdo da matéria

        if (url.includes('g1.globo.com')) {
            seletorTitulo = 'p'; // Seletor do título para o G1
            seletorLink = '.feed-post-link'; // Seletor do link para o G1
            seletorConteudo = '.content-text__container'; // Seletor do conteúdo para o G1
        } else if (url.includes('canalrural.com.br')) {
            seletorTitulo = '.post-title-feed-xl, .post-title-feed-lg'; // Seletor do título para o Canal Rural
            seletorLink = '.feed-link'; // Seletor do link para o Canal Rural
            seletorConteudo = '.post-content'; // Seletor do conteúdo para o Canal Rural
        }

        $(seletorLink).each((i, element) => {
            const titulo = $(element).find(seletorTitulo).text().trim();
            const link = $(element).attr('href');
            const conteudo = $(element).closest(seletorConteudo).text().trim(); // Extrai o conteúdo da matéria

            noticias.push({ titulo, link, conteudo });
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

async function main() {
    const idCidadeTresPontas = '39227';

    const noticiasG1Agronegocios = await extrairNoticias('https://g1.globo.com/economia/agronegocios/');
    const noticiasSulDeMinas = await extrairNoticias('https://g1.globo.com/mg/sul-de-minas/ultimas-noticias/');
    const noticiasCanalRural = await extrairNoticias('https://www.canalrural.com.br/agricultura/');

    const palavrasChave = [
        'café', 'soja', 'milho', 'agro', 'agronegócio',
        'trigo', 'cana-de-açúcar', 'pecuária', 'sustentabilidade',
        'exportação', 'mercado', 'tecnologia agrícola', 'política agrícola',
        'produção orgânica', 'fertilizantes', 'biotecnologia', 'irrigação',
        'segurança alimentar', 'comércio internacional', 'desenvolvimento rural', 'agrotóxico', 'Três Pontas',
        'Fertilizante', 'Fertilizantes', 'Adubo', 'Organomineral', 'Suíno', 'Equino', 'Bovino', 'Proteína', 'Santana da Vargem'
    ];
    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasSulDeMinas, ...noticiasCanalRural], palavrasChave);

    const previsaoTempo = await buscarPrevisaoTempo(idCidadeTresPontas);

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo });
    console.log(noticiasFiltradas, previsaoTempo);

    await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

