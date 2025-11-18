export function registerUpdateHub(socket) {
    console.log("✅ Agent updateHub registered (socket 'agent:update!!!!!!')");
    socket.on("agent:updateHubAppSend", async (payload, cb) => {
        console.log("[agent:update!!!!!!!!!!!!!!!!!] received:", payload);
        cb({ ok: true });
    });
}