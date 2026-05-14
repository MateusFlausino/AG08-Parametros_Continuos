import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

// Resolve a URL pedida para um arquivo local sem sair da pasta do projeto.
function resolveRequestPath(requestUrl) {
  const parsed = new URL(requestUrl, `http://localhost:${PORT}`);
  const safePath = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  return path.normalize(path.join(__dirname, safePath));
}

export function createStaticServer() {
  return http.createServer(async (req, res) => {
    const filePath = resolveRequestPath(req.url || "/");

    // Bloqueia caminhos fora da raiz do projeto e arquivos inexistentes.
    if (!filePath.startsWith(__dirname) || !existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Arquivo nao encontrado.");
      return;
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Acesso negado.");
      return;
    }

    const extension = path.extname(filePath);
    // Faz streaming do arquivo para evitar carregar o conteudo inteiro em memoria.
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });

    createReadStream(filePath).pipe(res);
  });
}

export function startStaticServer({ port = PORT, host = "127.0.0.1" } = {}) {
  const server = createStaticServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const resolvedPort =
        address && typeof address === "object" ? address.port : port;

      resolve({
        server,
        host,
        port: resolvedPort,
        url: `http://${host}:${resolvedPort}`,
      });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startStaticServer({ port: PORT })
    .then(({ url: serverUrl }) => {
      console.log(`Trabalho 8 disponivel em ${serverUrl}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
