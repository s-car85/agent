import { exec, spawn } from "child_process";
import path from "path";

export function registerShellExec(socket, identity) {
    console.log("registerShellExec");
    const baseDir = identity?.baseDir || "/";

    // tvoja postojeća one-shot komanda
    socket.on("shell:exec", (payload = {}, cb) => {
        const { cmd, cwd } = payload;
        if (!cmd) {
            cb?.({ ok: false, error: "No cmd provided" });
            return;
        }

        let workDir = baseDir;
        if (cwd) {
            workDir = path.isAbsolute(cwd) ? cwd : path.join(baseDir, cwd);
        }

        console.log("[shellExec] exec:", cmd, "CWD:", workDir);

        exec(cmd, {
            cwd: workDir,
            shell: "/bin/bash",
            timeout: 10_000,
            maxBuffer: 1024 * 1024 * 2
        }, (err, stdout = "", stderr = "") => {
            const res = {
                ok: !err,
                stdout,
                stderr: err ? (stderr || err.message) : stderr
            };

            if (typeof cb === "function") cb(res);
            else socket.emit("shell:result", { ...res, cmd, cwd: workDir });
        });
    });

    // primer za streaming, npr. pm2 logs
    socket.on("shell:stream", (payload = {}) => {
        const { cmd, cwd, id } = payload; // id koristiš na frontendu da povežeš stream

        if (!cmd) return;

        let workDir = baseDir;
        if (cwd) {
            workDir = path.isAbsolute(cwd) ? cwd : path.join(baseDir, cwd);
        }

        console.log("[shellStream] spawn:", cmd, "CWD:", workDir);

        const child = spawn("/bin/bash", ["-lc", cmd], { cwd: workDir });

        child.stdout.on("data", (chunk) => {
            socket.emit("shell:stream:data", {
                id,
                type: "stdout",
                data: chunk.toString()
            });
        });

        child.stderr.on("data", (chunk) => {
            socket.emit("shell:stream:data", {
                id,
                type: "stderr",
                data: chunk.toString()
            });
        });

        child.on("close", (code) => {
            socket.emit("shell:stream:end", { id, code });
        });

        // mogućnost da frontend kaže "stop"
        socket.once(`shell:stream:stop:${id}`, () => {
            child.kill("SIGINT");
        });
    });

    console.log("✅ Agent shellExec registered (socket 'shell:exec')");
}
