import fs from "fs";
import path from "path";
import axios from "axios";
import open from "open";
import dotenv from "dotenv";

dotenv.config();

const {
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH,
  GITHUB_FILE_PATH,
} = process.env;

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error(
    'Uso: node sync-cv.js "C:\Users\diogo\OneDrive\Documentos\curriculo.pdf"',
  );
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error("Arquivo não encontrado:", pdfPath);
  process.exit(1);
}

function logStep(message) {
  console.log(`\n=== ${message} ===`);
}

async function uploadToGitHub(fileBuffer, fileName) {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error("Variáveis do GitHub ausentes no .env");
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

  let sha = null;

  try {
    const currentFile = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    sha = currentFile.data.sha;
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error;
    }
  }

  await axios.put(
    apiUrl,
    {
      message: `Atualiza currículo: ${fileName}`,
      content: fileBuffer.toString("base64"),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  console.log("GitHub atualizado com sucesso.");
  console.log(
    `URL esperada: https://${GITHUB_OWNER}.github.io/${GITHUB_FILE_PATH}`,
  );
}

async function openLinkedInPage() {
  const linkedinUrl = "https://www.linkedin.com/jobs/application-settings/";
  await open(linkedinUrl);
  console.log("Página do LinkedIn aberta.");
}

async function main() {
  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);

    logStep("Enviando para o GitHub");
    await uploadToGitHub(fileBuffer, fileName);

    logStep("Abrindo o LinkedIn");
    await openLinkedInPage();

    logStep("Concluído");
    console.log(
      "Seu currículo foi enviado para o GitHub e a página do LinkedIn foi aberta.",
    );
  } catch (error) {
    console.error("\nErro:");
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

main();
