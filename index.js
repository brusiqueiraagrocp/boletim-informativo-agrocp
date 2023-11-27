const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;

 //Adicione no topo do seu arquivo
const apiKeyClimatempo = '573b14e6b0e45d20f009bb24901b72 93';

async function buscarPrevisaoTempo(idCidade) {
    try {
        const url = `http://api.openweathermap.org/data/2.5/weather?id=${idCidade}&appid=${apiKeyClimatempo}&units=metric`;
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
    const idCidadeTresPontas = '3446077'; 
    const previsaoTempo = await buscarPrevisaoTempo(idCidadeTresPontas);
   
    const noticiasG1Agronegocios = await extrairNoticias('https://g1.globo.com/economia/agronegocios/', 'feed-post-link', 'p.content-text__container', 'a');
    const noticiasSulDeMinas = await extrairNoticias('https://g1.globo.com/mg/sul-de-minas/ultimas-noticias/', '.bastian-page h2', 'a');
    const noticiasCanalRural = await extrairNoticias('https://www.canalrural.com.br/agricultura/', '.post-title-feed-lg, .post-title-feed-xl', '.feed-link');
   


    const palavrasChave = [
        'café', 'soja', 'milho', 'agro', 'agronegócio',
        'trigo', 'cana-de-açúcar', 'pecuária', 'sustentabilidade', 
        'exportação', 'mercado', 'tecnologia agrícola', 'política agrícola',
        'produção orgânica', 'fertilizantes', 'biotecnologia', 'irrigação',
        'segurança alimentar', 'comércio internacional', 'desenvolvimento rural', 'agrotóxico', 'Três Pontas',
        'Varginha', 'Fertilizante', 'Organomineral', 'Suíno', 'Equino', 'Bovino', 'Proteína', 'Santana da Vargem'
        
    ];
    const noticiasFiltradas = filtrarPorPalavrasChave([...noticiasG1Agronegocios, ...noticiasSulDeMinas, ...noticiasCanalRural], palavrasChave);

    const templateHtml = await fs.readFile('template.html', 'utf8');
    const template = handlebars.compile(templateHtml);
    console.log(noticiasFiltradas);
    const htmlFinal = template({ noticias: noticiasFiltradas}); //previsaoTempo });
    /*const htmlTeste = template({
        noticias: [
            { titulo: "Notícia Teste", descricao: "Descrição teste", link: "http://exemplo.com" }
        ]
    });
    */



      
    await enviarEmail('siqueirabruno455@gmail.com', 'Boletim Informativo AgroCP', htmlFinal);
}

main();

