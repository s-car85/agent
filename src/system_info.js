import { execSync } from "child_process";
import os from "os";
import fs from "fs";
import { readFile } from "fs/promises";

async function loadJson(filePath) {
  const data = await readFile(filePath, "utf8");
  return JSON.parse(data);
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function readJson(filePath, def = null) {
  try {
    const data = await readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return def;
  }
}


// CPU osnovno
function getCpuInfo() {
  const model = sh("grep -m1 'Model' /proc/cpuinfo || grep -m1 'model name' /proc/cpuinfo");
  const cores = os.cpus().length;
  const cur = parseInt(readFile("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq"));
  const min = parseInt(readFile("/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq"));
  const max = parseInt(readFile("/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq"));
  const temp = (() => {
    const t = parseInt(readFile("/sys/class/thermal/thermal_zone0/temp"));
    return isNaN(t) ? null : (t / 1000).toFixed(1);
  })();
  const throttled = sh("vcgencmd get_throttled");
  return {
    model: model || os.cpus()[0]?.model,
    cores,
    freqMHz: {
      current: cur ? (cur / 1000).toFixed(0) : null,
      min: min ? (min / 1000).toFixed(0) : null,
      max: max ? (max / 1000).toFixed(0) : null,
    },
    temperature: temp ? `${temp} °C` : null,
    throttled: throttled || null,
  };
}

// MEM info
function getMemory() {
  const free = os.freemem();
  const total = os.totalmem();
  const used = total - free;
  const swap = sh("free -b | awk '/Swap/ {print $2, $3, $4}'");
  const [swapTotal, swapUsed, swapFree] = swap ? swap.split(" ").map(Number) : [];
  return {
    ram: {
      totalMB: (total / 1024 / 1024).toFixed(0),
      usedMB: (used / 1024 / 1024).toFixed(0),
      freeMB: (free / 1024 / 1024).toFixed(0),
    },
    swap: {
      totalMB: (swapTotal / 1024 / 1024).toFixed(0) || null,
      usedMB: (swapUsed / 1024 / 1024).toFixed(0) || null,
      freeMB: (swapFree / 1024 / 1024).toFixed(0) || null,
    },
  };
}

// Disk + mount status
function getDisk() {
  const df = sh("df -h / | tail -1");
  const [fsName, size, used, avail, pct, mount] = df ? df.split(/\s+/) : [];
  const ro = sh("mount | grep ' on / ' | grep -o 'ro,'") ? "ro" : "rw";
  return {
    filesystem: fsName,
    size,
    used,
    avail,
    usePercent: pct,
    mount,
    mode: ro,
  };
}

// SD kartica (lsblk + greške)
function getSdInfo() {
  const lsblk = sh("lsblk -o NAME,MODEL,SIZE,TYPE,MOUNTPOINT -J");
  let parsed;
  try {
    parsed = JSON.parse(lsblk);
  } catch {
    parsed = null;
  }
  const dmesg = sh("dmesg --ctime | grep -iE 'mmc0|mmcblk0|i/o error|resetting' | tail -n 20");
  return { lsblk: parsed, errors: dmesg ? dmesg.split("\n") : [] };
}

// Load i uptime
function getLoad() {
  const [one, five, fifteen] = os.loadavg().map((x) => x.toFixed(2));
  const uptime = os.uptime();
  return { loadavg: { one, five, fifteen }, uptimeSec: uptime };
}

// Procesi po CPU/MEM
function getProcesses() {
  const topCpu = sh("ps axo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6");
  const topMem = sh("ps axo pid,pcpu,pmem,comm --sort=-pmem | head -n 6");
  return {
    topCpu: topCpu ? topCpu.split("\n").slice(1) : [],
    topMem: topMem ? topMem.split("\n").slice(1) : [],
  };
}

// Glavni objekat
function getSysInfo() {
  return {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: {
      os: os.platform(),
      release: os.release(),
      arch: os.arch(),
    },
    net: {
      ips: sh("hostname -I")?.trim().split(/\s+/) || [],
    },
    cpu: getCpuInfo(),
    memory: getMemory(),
    disk: getDisk(),
    sd: getSdInfo(),
    load: getLoad(),
    processes: getProcesses(),
  };
}


export function getPrimaryInterface() {
  const ifs = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifs)) {
    for (const a of addrs || []) {
      if (a.internal) continue;
      if (a.family === "IPv4") {
        return { name, address: a.address, mac: a.mac };
      }
    }
  }
  return { name: "unknown", address: "0.0.0.0", mac: "00:00:00:00:00:00" };
}

export async function getIdentity(baseDir) {
  const { name, address, mac } = getPrimaryInterface();
  const version = await loadJson("/home/pi/agent/version.json");
  console.log(version)
  return {... getSysInfo(),
    mac,
    hostname: os.hostname(),
    baseDir,
    version: version
  };
}
