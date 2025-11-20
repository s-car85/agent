import { exec } from "child_process";
import path from "path";

export function registerShellExec(socket, identity) {
    console.log('registerShellExec')
    const baseDir = identity?.baseDir || "/";

    socket.on("shell:exec", (payload = {}, cb) => {
        const { cmd, cwd } = payload;

        if (!cmd) {
            if (typeof cb === "function") {
                cb({ ok: false, error: "No cmd provided" });
            }
            return;
        }

        // izračunaj realni cwd na agentu
        let workDir = baseDir;
        if (cwd) {
            if (path.isAbsolute(cwd)) {
                workDir = cwd;
            } else {
                workDir = path.join(baseDir, cwd);
            }
        }

        console.log("[shellExec] exec:", cmd, "CWD:", workDir);

        exec(cmd, { cwd: workDir, shell: "/bin/bash" }, (err, stdout = "", stderr = "") => {
            const res = {
                ok: !err,
                stdout,
                stderr: err ? (stderr || err.message) : stderr
            };

            if (typeof cb === "function") cb(res);
            else socket.emit("shell:result", { ...res, cmd, cwd: workDir });
        });
    });

    console.log("✅ Agent shellExec registered (socket 'shell:exec')");
}
