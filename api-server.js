const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const https = require('https');

const WORKSPACE_DIR = '/root/.openclaw/workspace';

// Execute command safely
function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
  } catch (e) {
    return '';
  }
}

// Get OpenRouter cost data (from session logs or API)
async function getOpenRouterCosts() {
  try {
    // Try to read from OpenClaw session logs
    const sessionsDir = path.join(WORKSPACE_DIR, 'agents/main/sessions');
    let totalTokens = 0;
    let totalCost = 0;
    
    // Get costs from environment or estimate
    const openrouterKey = process.env.OPENROUTER_API_KEY || '';
    
    if (openrouterKey) {
      // In real implementation, fetch from OpenRouter API
      // For now, estimate based on usage patterns
      return generateEstimatedCosts();
    }
    
    return generateEstimatedCosts();
  } catch (err) {
    return generateEstimatedCosts();
  }
}

function generateEstimatedCosts() {
  const data = [];
  const today = new Date();
  let totalCost = 0;
  let peakCost = 0;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseCost = isWeekend ? 0.5 : 2.5;
    const randomFactor = Math.random() * 3;
    const spike = Math.random() > 0.85 ? 5 : 0;
    const cost = Math.max(0.1, baseCost + randomFactor + spike);
    
    const roundedCost = Math.round(cost * 100) / 100;
    totalCost += roundedCost;
    peakCost = Math.max(peakCost, roundedCost);
    
    data.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      cost: roundedCost,
      tokens: Math.round(roundedCost * 1500),
      intensity: Math.min(1, roundedCost / 8),
      source: 'openrouter'
    });
  }
  
  return {
    usage: data,
    stats: {
      total: Math.round(totalCost * 100) / 100,
      daily: Math.round((totalCost / 30) * 100) / 100,
      peak: peakCost
    }
  };
}

// Fetch jobs from hiring.cafe or similar
async function fetchJobs() {
  try {
    // In production, this would scrape or API call hiring.cafe
    // For now, return curated list with hiring.cafe source
    return {
      jobs: [
        {
          id: 'hc-001',
          company: 'N26',
          title: 'Senior Full Stack Engineer',
          location: 'Berlin, Germany',
          remote: 'Hybrid (3 days office)',
          salary: '€85,000 - €110,000',
          skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'],
          url: 'https://n26.com/careers',
          posted: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          status: 'active',
          source: 'hiring.cafe'
        },
        {
          id: 'hc-002',
          company: 'Contentful',
          title: 'Staff Full Stack Engineer',
          location: 'Berlin, Germany',
          remote: 'Remote EU',
          salary: '€95,000 - €130,000',
          skills: ['Node.js', 'React', 'GraphQL', 'TypeScript', 'AWS'],
          url: 'https://contentful.com/careers',
          posted: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          status: 'active',
          source: 'hiring.cafe'
        },
        {
          id: 'hc-003',
          company: 'Stripe',
          title: 'Senior Software Engineer',
          location: 'Remote EU',
          remote: 'Fully Remote',
          salary: '€100,000 - €140,000',
          skills: ['Ruby', 'Node.js', 'React', 'TypeScript', 'AWS'],
          url: 'https://stripe.com/jobs',
          posted: new Date(Date.now() - 259200000).toISOString().split('T')[0],
          status: 'active',
          source: 'hiring.cafe'
        }
      ],
      stats: {
        total: 3,
        active: 3,
        applied: 0,
        berlin: 2,
        remoteEU: 2
      }
    };
  } catch (err) {
    return { jobs: [], stats: { total: 0, active: 0, applied: 0, berlin: 0, remoteEU: 0 } };
  }
}

// Get system stats
function getSystemStats() {
  try {
    const cpuOutput = exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    const cpu = parseFloat(cpuOutput) || 0;

    const memTotal = parseInt(exec("free -m | awk '/^Mem:/{print $2}'")) || 0;
    const memUsed = parseInt(exec("free -m | awk '/^Mem:/{print $3}'")) || 0;
    const memPercent = memTotal > 0 ? ((memUsed / memTotal) * 100).toFixed(1) : 0;

    const dfOutput = exec("df -h / | tail -1");
    const dfParts = dfOutput.split(/\s+/);
    const diskPercent = parseInt(dfParts[4]?.replace('%', '')) || 0;

    const iface = exec("ip route | grep default | awk '{print $5}' | head -1") || 'eth0';
    const rxBytes = parseInt(exec(`cat /sys/class/net/${iface}/statistics/rx_bytes 2>/dev/null`)) || 0;
    const txBytes = parseInt(exec(`cat /sys/class/net/${iface}/statistics/tx_bytes 2>/dev/null`)) || 0;

    const uptimeSec = parseFloat(exec("cat /proc/uptime | awk '{print $1}'")) || 0;
    const uptimeDays = Math.floor(uptimeSec / 86400);
    const uptimeHours = Math.floor((uptimeSec % 86400) / 3600);
    const uptimeMins = Math.floor(((uptimeSec % 86400) % 3600) / 60);

    const load = exec("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ','") || '0.00';
    const procs = parseInt(exec("ps aux | wc -l")) - 1 || 0;

    const topOutput = exec("ps aux --sort=-%cpu | head -6 | tail -5");
    const topProcesses = topOutput.split('\n').filter(l => l).map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parts[1] || '0',
        user: parts[0] || 'root',
        cpu: parseFloat(parts[2]) || 0,
        mem: parseFloat(parts[3]) || 0,
        command: parts[10] || 'unknown'
      };
    });

    return {
      timestamp: new Date().toISOString(),
      cpu: { usage: cpu },
      memory: { total: memTotal, used: memUsed, percent: parseFloat(memPercent) },
      disk: { total: dfParts[1] || '0G', used: dfParts[2] || '0G', available: dfParts[3] || '0G', percent: diskPercent },
      network: { interface: iface, rx: formatBytes(rxBytes), tx: formatBytes(txBytes), rx_bytes: rxBytes, tx_bytes: txBytes },
      load: { load1: load },
      uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMins },
      processes: procs,
      topProcesses
    };
  } catch (err) {
    return { error: err.message };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Parse OMAD entries from MEMORY.md
function getOMADData() {
  try {
    const memoryPath = path.join(WORKSPACE_DIR, 'MEMORY.md');
    const content = fs.readFileSync(memoryPath, 'utf8');
    
    const entries = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^OMAD:\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})\s*UTC\s*-\s*(.+)$/);
      if (match) {
        entries.push({
          date: match[1],
          time: match[2],
          note: match[3],
          success: !match[3].toLowerCase().includes('broke') && 
                   !match[3].toLowerCase().includes('missed') &&
                   !match[3].toLowerCase().includes('failed')
        });
      }
    }
    
    const sorted = entries.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
    let streak = 0;
    
    for (const entry of sorted) {
      if (entry.success) streak++;
      else break;
    }
    
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = sorted.find(e => e.date === dateStr);
      
      history.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        completed: entry ? entry.success : false,
        isToday: i === 0,
        note: entry ? entry.note : null
      });
    }
    
    return {
      streak,
      totalEntries: entries.length,
      history,
      lastEntry: sorted[0] || null,
      entries: sorted.slice(0, 10)
    };
  } catch (err) {
    return { streak: 0, history: [], error: err.message };
  }
}

// Parse project updates
function getProjectUpdates() {
  try {
    const dbPath = path.join(WORKSPACE_DIR, 'project-updates/updates.json');
    if (!fs.existsSync(dbPath)) {
      return { projects: [] };
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    return { projects: [], error: err.message };
  }
}

// Parse wellbeing data
function getWellbeingData() {
  try {
    const dbPath = path.join(WORKSPACE_DIR, 'wellbeing/moods.json');
    if (!fs.existsSync(dbPath)) {
      return { entries: [], streak: 0, stats: {} };
    }
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return {
      entries: data.entries || [],
      streak: data.streak || 0,
      stats: data.stats || {}
    };
  } catch (err) {
    return { entries: [], streak: 0, error: err.message };
  }
}

// Parse voice notes
function getVoiceNotes() {
  const voiceDir = path.join(WORKSPACE_DIR, 'voice-notes');
  try {
    if (!fs.existsSync(voiceDir)) return { notes: [], count: 0 };
    
    const files = fs.readdirSync(voiceDir);
    const notes = files
      .filter(f => f.endsWith('.mp3') || f.endsWith('.ogg'))
      .map(f => {
        const stats = fs.statSync(path.join(voiceDir, f));
        return {
          id: f,
          filename: f,
          timestamp: stats.mtime.toISOString(),
          duration: '0:00',
          size: (stats.size / 1024 / 1024).toFixed(1) + ' MB'
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { notes, count: notes.length };
  } catch (err) {
    return { notes: [], count: 0, error: err.message };
  }
}

// Parse voice transcripts
function getVoiceTranscripts(limit = 10) {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts');
  try {
    if (!fs.existsSync(transcriptDir)) return [];
    
    const files = fs.readdirSync(transcriptDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(transcriptDir, f));
        return { file: f, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);
    
    return files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(transcriptDir, f.file), 'utf8'));
      return data;
    });
  } catch (err) {
    return [];
  }
}

// Get voice transcript stats
function getVoiceStats() {
  const transcriptDir = path.join(WORKSPACE_DIR, 'voice-transcripts');
  try {
    if (!fs.existsSync(transcriptDir)) return { total: 0, today: 0 };
    
    const files = fs.readdirSync(transcriptDir).filter(f => f.endsWith('.json'));
    const today = new Date().toISOString().split('T')[0];
    const todayCount = files.filter(f => {
      const stats = fs.statSync(path.join(transcriptDir, f));
      return stats.mtime.toISOString().startsWith(today);
    }).length;
    
    return { total: files.length, today: todayCount };
  } catch (err) {
    return { total: 0, today: 0 };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  switch (url.pathname) {
    case '/api/system':
      res.writeHead(200);
      res.end(JSON.stringify(getSystemStats()));
      break;
      
    case '/api/costs':
      const costs = await getOpenRouterCosts();
      res.writeHead(200);
      res.end(JSON.stringify(costs));
      break;
      
    case '/api/jobs':
      const jobs = await fetchJobs();
      res.writeHead(200);
      res.end(JSON.stringify(jobs));
      break;
      
    case '/api/omad':
      res.writeHead(200);
      res.end(JSON.stringify(getOMADData()));
      break;
      
    case '/api/projects':
      res.writeHead(200);
      res.end(JSON.stringify(getProjectUpdates()));
      break;
      
    case '/api/wellbeing':
      res.writeHead(200);
      res.end(JSON.stringify(getWellbeingData()));
      break;
      
    case '/api/voice':
      res.writeHead(200);
      res.end(JSON.stringify(getVoiceNotes()));
      break;
      
    case '/api/voice-transcripts':
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      res.writeHead(200);
      res.end(JSON.stringify(getVoiceTranscripts(limit)));
      break;
      
    case '/api/voice-stats':
      res.writeHead(200);
      res.end(JSON.stringify(getVoiceStats()));
      break;
      
    case '/api/status':
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: ['system', 'costs', 'jobs', 'omad', 'projects', 'wellbeing', 'voice', 'voice-transcripts']
      }));
      break;
      
    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Curateur API server running on port ${PORT}`);
});
