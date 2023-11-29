const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;

 //Adicione no topo do seu arquivo
const apiKeyAccuWeather = '	DjHROZ2m0EasT2mugUGeiKcCk19ReDPE';

async function buscarPrevisaoTempo(idCidade) {
    try {
        // A URL depende de qual endpoint da API do AccuWeather você quer usar
        const url = `http://dataservice.accuweather.com/currentconditions/v1/${idCidade}?apikey=${apiKeyAccuWeather}&language=pt-BR&details=true`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar previsão do tempo para a cidade ID ${idCidade}:`, error);
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
    
   
    const noticiasG1Agronegocios = await extrairNoticias('https://g1.globo.com/economia/agronegocios/', 'feed-post-link', 'p.content-text__container', 'a');
    const noticiasSulDeMinas = await extrairNoticias('https://g1.globo.com/mg/sul-de-minas/ultimas-noticias/', '.bastian-page h2', 'a');
    const noticiasCanalRural = await extrairNoticias('https://www.canalrural.com.br/agricultura/', '.post-title-feed-lg, .post-title-feed-xl', '.feed-link');
   


    const palavrasChave = [
        'café', 'soja', 'milho', 'agro', 'agronegócio',
        'trigo', 'cana-de-açúcar', 'pecuária', 'sustentabilidade', 
        'exportação', 'mercado', 'tecnologia agrícola', 'política agrícola',
        'produção orgânica', 'fertilizantes', 'biotecnologia', 'irrigação',
        'segurança alimentar', 'comércio internacional', 'desenvolvimento rural', 'agrotóxico', 'Três Pontas',
        'Fertilizante', 'Organomineral', 'Suíno', 'Equino', 'Bovino', 'Proteína', 'Santana da Vargem'
        
    ];
    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasSulDeMinas, ...noticiasCanalRural], palavrasChave);

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    console.log(noticiasFiltradas);
    
    /*const htmlTeste = template({
        noticias: [
            { titulo: "Notícia Teste", descricao: "Descrição teste", link: "http://exemplo.com" }
        ]
    });
    */

    // Chama a função buscarPrevisaoTempo para obter os dados da previsão do tempo
    const previsaoTempo = await buscarPrevisaoTempo(idCidadeTresPontas);

    if (previsaoTempo) {
        // Os dados da previsão do tempo estão disponíveis em 'previsaoTempo'
        console.log('Previsão do Tempo:', previsaoTempo);
        
        // Acessando os dados específicos da previsão
        const temperatura = previsaoTempo[0].Temperature.Metric.Value;
        const condicaoClimatica = previsaoTempo[0].WeatherText;
        const humidade = previsaoTempo[0].RelativeHumidity;
        const indiceUV = previsaoTempo[0].UVIndex;
        const textoIndiceUV = previsaoTempo[0].UVIndexText;
        const pressaoAtmosferica = previsaoTempo[0].Pressure.Metric.Value;
        const tendenciaPressao = previsaoTempo[0].PressureTendency.LocalizedText;
        const coberturaNuvens = previsaoTempo[0].CloudCover;
    
        console.log('Temperatura:', temperatura);
        console.log('Condição Climática:', condicaoClimatica);
        console.log('Humidade:', humidade);
        console.log('Índice UV:', indiceUV, textoIndiceUV);
        console.log('Pressão Atmosférica:', pressaoAtmosferica, 'Tendência:', tendenciaPressao);
        console.log('Cobertura de Nuvens:', coberturaNuvens);
    } else {
        console.log('Não foi possível obter a previsão do tempo.');
    }


        const htmlFinal = template({ noticias: noticiasFiltradas, previsaoTempo: previsaoTempo });
    
        await enviarEmail('bruno.siqueira@agrocp.agr.br', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

