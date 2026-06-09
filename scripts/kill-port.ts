import { freePort } from "../src/utils/freePort.js";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 5001;
const killed = freePort(port);

if (killed.length === 0) {
  console.log(`Port ${port} is already free.`);
} else {
  for (const pid of killed) {
    console.log(`Freed port ${port} (PID ${pid})`);
  }
}
