import { exec } from "child_process";

export function updateHubDone(socket) {
  console.log("🔄 registerUpdateHubDone");
  socket.on("agent:updateHubDone", async (payload, ack) => {
    try {
      console.log("📦 Update završio, restartujem pm2...");
      setTimeout(() => {
        exec("pm2 restart agent", (err, stdout, stderr) => {
          if (err) {
            console.error("❌ Greška pri pm2 restart:", err);
            ack && ack({ ok: false, error: err.message });
            return;
          }
          console.log("🔁 PM2 restart agent OK");
        }, 5000);

        ack && ack({ ok: true });
      });
    } catch (e) {
      console.error("❌ agent:updateHubDone error:", e);
      ack && ack({ ok: false, error: e.message });
    }
  });
}