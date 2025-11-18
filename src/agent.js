import { io } from "socket.io-client";
import { HUB_URL, BASE_DIR, HEARTBEAT_MS } from "./config.js";
import { getIdentity } from "./system_info.js";
import { listDir, readFileBase64, writeFileBase64, makeDir, removePath } from "./fs_helper.js";
import { registerShellExec } from "./shellExec.js";
import { registerUpdateHub } from "./updateHub.js";

const identity = getIdentity(BASE_DIR);

function connect() {
  const socket = io(HUB_URL, { transports: ["websocket"], reconnection: true, reconnectionDelay: 2000,perMessageDeflate: { threshold: 1024 }});

  socket.on("connect", () => {
    console.log("[agent] connected:", socket.id, "→", HUB_URL);
    socket.emit("register", identity);
  });

  // Heartbeat
  const hb = setInterval(() => {
    try {
      socket.emit("heartbeat", { mac: identity.mac });
    } catch { }
  }, HEARTBEAT_MS);

  const ackWrap = (fn) => async (payload = {}, cb) => {
    try {
      const res = await fn(payload);
      if (typeof cb === "function") cb(res);
      else console.log("[fs] no-ack result:", res);
    } catch (e) {
      const err = { ok: false, error: String(e) };
      if (typeof cb === "function") cb(err);
      else console.error("[fs] error without ack:", err);
    }
  };

  const getRel = (p = {}) => String(p.relPath ?? p.path ?? ".").replace(/^\/+/, "");
  const withBase = (fn) => (payload) => fn(identity.baseDir, getRel(payload), payload);

  registerShellExec(socket); // registruje "shell:exec"
  registerUpdateHub(socket); // registruje "agent:update"

  socket.on("fs:list", ackWrap(withBase((base, rel) => listDir(base, rel))));
  socket.on("fs:read", ackWrap(withBase((base, rel) => readFileBase64(base, rel))));
  socket.on("fs:write", ackWrap(withBase((base, rel, p) => writeFileBase64(base, rel, p.base64))));
  socket.on("fs:mkdir", ackWrap(withBase((base, rel) => makeDir(base, rel))));
  socket.on("fs:delete", ackWrap(withBase((base, rel) => removePath(base, rel))));

  socket.on("disconnect", (r) => {
    console.log("[agent] disconnected:", r);
  });

  socket.on("connect_error", (e) => {
    console.log("[agent] connect_error:", e);
  });

  return () => {
    clearInterval(hb);
    socket.close();
  };
}

connect();