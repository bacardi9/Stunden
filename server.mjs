// Minimal dependency-free static file server for the Stunden app.
// Binds to 0.0.0.0 and uses the PORT injected by the platform.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";
const ROOT = fileURLToPath(new URL(".", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json"
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const clean = decoded === "/" ? "/index.html" : decoded;
  const filePath = normalize(join(ROOT, clean));
  if (!filePath.startsWith(ROOT)) return null; // prevent traversal
  return filePath;
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = (req.url || "/").split("?")[0];
    const filePath = resolvePath(urlPath);

    if (!filePath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    if (info.isDirectory()) {
      const indexPath = join(filePath, "index.html");
      try {
        await stat(indexPath);
        info = await stat(indexPath);
      } catch {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      const body = await readFile(indexPath);
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(body);
      return;
    }

    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  } catch (error) {
    console.error("Static server error:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Stunden static server listening on http://${HOST}:${PORT}`);
});
