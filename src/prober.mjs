import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const LATENCY_REGEX = /time=(\d+\.?\d*) ms/;

function buildPingCommand(host) {
  if (process.platform === 'darwin') {
    // macOS uses milliseconds for -W, so 2000ms keeps the 2s timeout behavior.
    return `ping -c 1 -W 2000 ${host}`;
  }

  return `ping -c 1 -W 2 ${host}`;
}

function summarizeOutput(output) {
  if (!output) {
    return '';
  }

  return output
    .trim()
    .split('\n')
    .slice(0, 3)
    .join(' | ');
}

export async function ping(host) {
  try {
    const command = buildPingCommand(host);
    const { stdout } = await execAsync(command, {
      timeout: 4000
    });

    const match = stdout.match(LATENCY_REGEX);
    if (!match) {
      console.warn(`Ping output missing latency for ${host}: ${summarizeOutput(stdout)}`);
      return -1;
    }

    const latency = Number.parseFloat(match[1]);
    return Number.isNaN(latency) ? -1 : latency;
  } catch (error) {
    const message = error?.message ?? 'Unknown ping error';
    console.warn(`Ping failed for ${host}: ${message}`);
    if (error?.stdout) {
      console.warn(`Ping stdout for ${host}: ${summarizeOutput(error.stdout)}`);
    }
    if (error?.stderr) {
      console.warn(`Ping stderr for ${host}: ${summarizeOutput(error.stderr)}`);
    }
    return -1;
  }
}

export async function probeAll(targets) {
  const entries = await Promise.all(
    targets.map(async (target) => {
      try {
        return [target.id, await ping(target.host)];
      } catch (error) {
        console.warn(`Probe failed for ${target.host}: ${error?.message ?? error}`);
        return [target.id, -1];
      }
    })
  );

  return Object.fromEntries(entries);
}
