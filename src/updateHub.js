import fs from "fs/promises";
import { createReadStream } from "fs";   // ⬅ OVO JE BITNO
import path from "path";
import unzipper from "unzipper";

const DEFAULT_TARGET_DIR = "/home/pi/agent";

async function cleanTargetDir(targetDir) {
  const entries = await fs
    .readdir(targetDir, { withFileTypes: true })
    .catch(async (err) => {
      if (err.code === "ENOENT") {
        await fs.mkdir(targetDir, { recursive: true });
        return [];
      }
      throw err;
    });

  for (const entry of entries) {
    const full = path.join(targetDir, entry.name);
    await fs.rm(full, { recursive: true, force: true });
  }
}

export function registerUpdateHub(socket, targetDir = DEFAULT_TARGET_DIR) {
  console.log("📁 registerUpdateHub ZIP, targetDir =", targetDir);

  // ZIP UPDATE
  socket.on("agent:updateZip", async ({ zipBase64 }, ack) => {
    try {
      if (!zipBase64 || typeof zipBase64 !== "string") {
        throw new Error("zipBase64 je obavezan string");
      }

      console.log("📦 Primljen ZIP (base64), zapisujem u /tmp/update.zip ...");
      const tmpZip = "/tmp/agent_update.zip";

      // snimi ZIP fajl
      await fs.writeFile(tmpZip, Buffer.from(zipBase64, "base64"));

      console.log("🧹 Čistim sadržaj targetDir:", targetDir);
      await cleanTargetDir(targetDir);

      console.log("📂 Raspakujem ZIP u", targetDir);
      await createReadStream(tmpZip)
        .pipe(unzipper.Extract({ path: targetDir }))
        .promise();

      console.log("✅ ZIP update završen.");
      ack?.({ ok: true });

    } catch (e) {
      console.error("❌ Greška ZIP update na agentu:", e);
      ack?.({ ok: false, error: e.message });
    }
  });
}
