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

  // Corrige encoding do caminho (importante para subpastas)
  const encodedPath = GITHUB_FILE_PATH.split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}`;

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

  console.log("✔ GitHub atualizado com sucesso.");
  console.log(`URL: https://${GITHUB_OWNER}.github.io/${GITHUB_FILE_PATH}`);
}

async function openLinkedInPage() {
  const url = "https://www.linkedin.com/jobs/application-settings/";
  await open(url);
  console.log("🔗 LinkedIn aberto.");
}

async function openIndeedPage() {
  const url = "https://profile.indeed.com/resume";
  await open(url);
  console.log("🔗 Indeed aberto.");
}

async function main() {
  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);

    logStep("Enviando para o GitHub");
    await uploadToGitHub(fileBuffer, fileName);

    logStep("Abrindo páginas para atualização manual");
    await openLinkedInPage();
    await openIndeedPage();

    logStep("Concluído");
    console.log("✔ GitHub sincronizado");
    console.log("⏳ Atualize manualmente LinkedIn e Indeed (abas já abertas)");
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
