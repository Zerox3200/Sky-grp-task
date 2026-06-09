import { execSync } from "node:child_process";

const getListeningPidsWindows = (port: number): string[] => {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set<string>();

    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING")) {
        continue;
      }

      const localAddress = line.trim().split(/\s+/)[1] ?? "";
      if (!localAddress.endsWith(`:${port}`)) {
        continue;
      }

      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") {
        pids.add(pid);
      }
    }

    return [...pids];
  } catch {
    return [];
  }
};

const getListeningPidsUnix = (port: number): string[] => {
  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf8" });
    return output
      .split("\n")
      .map((pid) => pid.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const killPid = (pid: string): boolean => {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }

    return true;
  } catch {
    return false;
  }
};

export const freePort = (port: number, excludePid = process.pid): string[] => {
  const pids =
    process.platform === "win32" ? getListeningPidsWindows(port) : getListeningPidsUnix(port);

  const killed: string[] = [];

  for (const pid of pids) {
    if (Number(pid) === excludePid) {
      continue;
    }

    if (killPid(pid)) {
      killed.push(pid);
    }
  }

  return killed;
};

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
