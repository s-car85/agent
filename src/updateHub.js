// folderReceiver.js
import fs from "fs/promises";
import path from "path";

const DEFAULT_TARGET_DIR = "/home/pi/agent";

// Bezbedno spajanje putanje da ne izađe iz baze
function safeJoin(base, rel) {
  const full = path.normalize(path.join(base, rel));
  const normBase = path.normalize(base);
  if (!full.startsWith(normBase)) {
    throw new Error("Relativna putanja izlazi iz TARGET_DIR-a");
  }
  return full;
}

export function registerUpdateHub(socket, targetDir = DEFAULT_TARGET_DIR) {
    console.log("📁 registerFolderReceiver, targetDir =", targetDir);
    socket.on("agent:updateHubAppSend", async (payload, ack) => {
      
      try {
        const { relPath, base64, mode, mtimeMs } = payload || {};
        if (!relPath || typeof base64 !== "string") {
          throw new Error("relPath i base64 su obavezni");
        }
  
        const destPath = safeJoin(targetDir, relPath);
        const destDir = path.dirname(destPath);
  
        await fs.mkdir(destDir, { recursive: true });
        await fs.writeFile(destPath, Buffer.from(base64, "base64"));
  
        // permissions
        if (typeof mode === "number") {
          await fs.chmod(destPath, mode);
        }
  
        // mtime
        if (typeof mtimeMs === "number") {
          const mtime = new Date(mtimeMs);
          await fs.utimes(destPath, mtime, mtime);
        }
  
        console.log("📥 Primljen fajl:", destPath);
        ack?.({ ok: true });
      } catch (e) {
        console.error("❌ Greška folder:write:", e);
        ack?.({ ok: false, error: e.message });
      }
    });
  }
  
  