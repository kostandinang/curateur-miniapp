import { Hono } from 'hono'
import { execSafe, formatBytes } from '../../../api/lib/shell'

// Safe interface name pattern -- alphanumeric, hyphens, underscores only
const IFACE_PATTERN = /^[a-zA-Z0-9_-]+$/

interface SystemStats {
  timestamp: string
  cpu: { usage: number }
  memory: { total: number; used: number; percent: number }
  disk: { total: string; used: string; available: string; percent: number }
  network: { interface: string; rx: string; tx: string; rx_bytes: number; tx_bytes: number }
  load: { load1: string }
  uptime: { days: number; hours: number; minutes: number }
  processes: number
  topProcesses: { pid: string; user: string; cpu: number; mem: number; command: string }[]
}

function getSystemStats(): SystemStats | { error: string } {
  try {
    const cpuOutput = execSafe("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
    const cpu = parseFloat(cpuOutput) || 0

    const memTotal = parseInt(execSafe("free -m | awk '/^Mem:/{print $2}'"), 10) || 0
    const memUsed = parseInt(execSafe("free -m | awk '/^Mem:/{print $3}'"), 10) || 0
    const memPercent = memTotal > 0 ? parseFloat(((memUsed / memTotal) * 100).toFixed(1)) : 0

    const dfOutput = execSafe('df -h / | tail -1')
    const dfParts = dfOutput.split(/\s+/)
    const diskPercent = parseInt(dfParts[4]?.replace('%', '') ?? '0', 10) || 0

    const iface = execSafe("ip route | grep default | awk '{print $5}' | head -1") || 'eth0'

    let rxBytes = 0
    let txBytes = 0
    if (IFACE_PATTERN.test(iface)) {
      rxBytes =
        parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/rx_bytes 2>/dev/null`), 10) || 0
      txBytes =
        parseInt(execSafe(`cat /sys/class/net/${iface}/statistics/tx_bytes 2>/dev/null`), 10) || 0
    }

    const uptimeSec = parseFloat(execSafe("cat /proc/uptime | awk '{print $1}'")) || 0
    const uptimeDays = Math.floor(uptimeSec / 86400)
    const uptimeHours = Math.floor((uptimeSec % 86400) / 3600)
    const uptimeMins = Math.floor(((uptimeSec % 86400) % 3600) / 60)

    const load =
      execSafe("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ','") ||
      '0.00'
    const procs = (parseInt(execSafe('ps aux | wc -l'), 10) || 1) - 1

    const topOutput = execSafe('ps aux --sort=-%cpu | head -6 | tail -5')
    const topProcesses = topOutput
      .split('\n')
      .filter((l: string) => l)
      .map((line: string) => {
        const parts = line.trim().split(/\s+/)
        return {
          pid: parts[1] || '0',
          user: parts[0] || 'root',
          cpu: parseFloat(parts[2] ?? '0') || 0,
          mem: parseFloat(parts[3] ?? '0') || 0,
          command: parts[10] || 'unknown',
        }
      })

    return {
      timestamp: new Date().toISOString(),
      cpu: { usage: cpu },
      memory: { total: memTotal, used: memUsed, percent: memPercent },
      disk: {
        total: dfParts[1] || '0G',
        used: dfParts[2] || '0G',
        available: dfParts[3] || '0G',
        percent: diskPercent,
      },
      network: {
        interface: iface,
        rx: formatBytes(rxBytes),
        tx: formatBytes(txBytes),
        rx_bytes: rxBytes,
        tx_bytes: txBytes,
      },
      load: { load1: load },
      uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMins },
      processes: procs,
      topProcesses,
    }
  } catch {
    return { error: 'Failed to collect system stats' }
  }
}

const router = new Hono()

router.get('/', (c) => {
  return c.json(getSystemStats())
})

export default router
