import fs from "fs/promises";
import path from "path";
import { lookup as mimeLookup } from "mime-types";

function resolveSafe(baseDir, rel) {
  const p = path.resolve(baseDir, rel || ".");
  if (!p.startsWith(path.resolve(baseDir))) {
    throw new Error("Path traversal blocked");
  }
  return p;
}

export async function listDir(baseDir, relPath=".") {
  
  console.log(baseDir, relPath);
  const abs = resolveSafe(baseDir, relPath);
  const dirents = await fs.readdir(abs, { withFileTypes: true });
  const items = await Promise.all(dirents.map(async d => {
    const full = path.join(abs, d.name);
    try {
      const st = await fs.stat(full);
      return {
        name: d.name,
        type: d.isDirectory() ? "dir" : "file",
        size: st.size,
        mtime: st.mtimeMs
      };
    } catch {
      return { name: d.name, type: d.isDirectory() ? "dir" : "file" };
    }
  }));
  return { ok: true, cwd: abs, items };
}

export async function readFileBase64(baseDir, relPath) {
  const abs = resolveSafe(baseDir, relPath);
  const data = await fs.readFile(abs);
  const mime = mimeLookup(abs) || "application/octet-stream";
  return { ok: true, name: relPath, mime, base64: data.toString("base64") };
}

export async function writeFileBase64(baseDir, relPath, base64) {
  const abs = resolveSafe(baseDir, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buf = base64 ? Buffer.from(base64, "base64") : Buffer.alloc(0);
  await fs.writeFile(abs, buf);
  return { ok: true };
}

export async function makeDir(baseDir, relPath) {
  const abs = resolveSafe(baseDir, relPath);
  await fs.mkdir(abs, { recursive: true });
  return { ok: true };
}

export async function removePath(baseDir, relPath) {
  const abs = resolveSafe(baseDir, relPath);
  await fs.rm(abs, { recursive: true, force: true });
  return { ok: true };
}