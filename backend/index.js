const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const oracledb = require('oracledb');
const os = require('oci-objectstorage');
const common = require("oci-common");
const fs = require('fs');
const dotenv = require('dotenv');
const cors = require('cors'); // Importa o pacote cors

const provider = new common.ConfigFileAuthenticationDetailsProvider(
    './config',
    'DEFAULT'
);

dotenv.config();
app.use(bodyParser.json());
app.use(cors());

const client = new os.ObjectStorageClient({
    authenticationDetailsProvider: provider
});

// Configuração do multer para lidar com o upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Porta em que o servidor será iniciado
const porta = 3000;

// Rota para obter todas as imagens
app.get('/', async (req, res) => {
    let dadosImagens = await getImagensCadastradas();

    for (let index = 0; index < dadosImagens.length; index++) {
        const dadosImagem = dadosImagens[index];
        dadosImagem.arquivo = await getArquivoImagem(dadosImagem.id);
    }

    console.log(dadosImagens);

    res.json(dadosImagens);
});

// Rota para criar uma nova imagem
app.post('/', upload.single('imagem'), async (req, res) => {
    const { titulo } = req.body;
    const imagem = req.file.buffer;
    const id = Date.now();

    console.log(id, imagem);

    await cadastrarImagem({ id, titulo });
    await enviarImagem({ id, imagem });
    res.status(200).send();
});

// Rota para excluir uma imagem por ID
app.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    await excluirImagem(id);
    await removerArquivoImagem(id);
    res.status(200).send();
});

// Inicia o servidor
app.listen(porta, () => {
    console.log(`Servidor iniciado na porta ${porta}`);
});

async function enviarImagem({ id, imagem }) {
    await client.putObject({
        namespaceName: 'gr0lktzyr9jg',
        bucketName: 'bucket-trabalho-final',
        objectName: id,
        putObjectBody: imagem,
        contentLength: imagem.length
    });
}

async function getArquivoImagem(id) {
    const object = await client.getObject({
        objectName: id.toString(),
        bucketName: 'bucket-trabalho-final',
        namespaceName: 'gr0lktzyr9jg'
    });

    const blob = await streamToBlob(object.value);
    const buffer = await blob.arrayBuffer();

    return Buffer.from(buffer).toString('base64');
}

async function streamToBlob(stream) {
    const reader = stream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
    }

    return new Blob(chunks);
}

async function removerArquivoImagem(id) {
    await client.deleteObject({
        namespaceName: 'gr0lktzyr9jg',
        bucketName: 'bucket-trabalho-final',
        objectName: id
    });
}

async function cadastrarImagem({ id, titulo }) {
    let connection;

    try {
        connection = await oracledb.getConnection({
            user: "admin",
            password: process.env.DB_PASS,
            connectionString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.sa-saopaulo-1.oraclecloud.com))(connect_data=(service_name=gf47bb0307dfb89_trabalhofinal_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
        });

        const sql = `INSERT INTO IMAGENS(ID, TITULO) VALUES (:id, :titulo)`;
        const binds = { id, titulo };

        console.log(sql); // Imprime a instrução SQL para fins de depuração

        await connection.execute(sql, binds, { autoCommit: true }); // Executa a inserção e faz commit automaticamente
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

async function getImagensCadastradas() {
    let connection;

    try {
        connection = await oracledb.getConnection({
            user: "admin",
            password: process.env.DB_PASS,
            connectionString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.sa-saopaulo-1.oraclecloud.com))(connect_data=(service_name=gf47bb0307dfb89_trabalhofinal_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
        });

        const sql = 'SELECT * FROM IMAGENS';
        const result = await connection.execute(sql);

        return result.rows.map(colunas => { return { id: parseInt(colunas[0]), titulo: colunas[1] } });
    } catch (err) {
        console.error(err);
        throw err; // Propaga a exceção para o chamador
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

async function excluirImagem(id) {
    let connection;

    try {
        connection = await oracledb.getConnection({
            user: "admin",
            password: process.env.DB_PASS,
            connectionString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.sa-saopaulo-1.oraclecloud.com))(connect_data=(service_name=gf47bb0307dfb89_trabalhofinal_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
        });

        const sql = 'DELETE FROM IMAGENS WHERE ID = :id';
        const binds = { id };

        await connection.execute(sql, binds, { autoCommit: true });
    } catch (err) {
        console.error(err);
        throw err; // Propaga a exceção para o chamador
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}