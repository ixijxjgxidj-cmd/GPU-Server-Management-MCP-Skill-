export const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSH 服务器管理</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #09090b; --card-bg: #18181b; --card-hover: #27272a; 
      --text: #f4f4f5; --text-dim: #a1a1aa; 
      --accent: #3b82f6; --accent-hover: #2563eb; --accent-glow: rgba(59, 130, 246, 0.5);
      --green: #10b981; --green-bg: rgba(16, 185, 129, 0.1);
      --yellow: #f59e0b; --yellow-bg: rgba(245, 158, 11, 0.1);
      --red: #ef4444; --red-bg: rgba(239, 68, 68, 0.1);
      --border: #27272a; --border-hover: #3f3f46;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body { 
      font-family: var(--font-main); 
      background: var(--bg); 
      color: var(--text); 
      min-height: 100vh; 
      overflow-x: hidden;
      background-image: radial-gradient(circle at 50% 0%, #1a1a24 0%, transparent 50%);
    }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

    .nav { 
      display: flex; gap: 8px; padding: 12px 24px; 
      background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border); 
      position: sticky; top: 0; z-index: 50;
    }
    .nav button { 
      padding: 8px 16px; background: transparent; color: var(--text-dim); 
      border: 1px solid transparent; border-radius: 8px; cursor: pointer; 
      font-size: 14px; font-weight: 500; transition: all 0.2s ease; 
    }
    .nav button:hover { color: var(--text); background: var(--border); }
    .nav button.active { 
      color: var(--text); background: var(--border);
      border-color: var(--border-hover); box-shadow: 0 0 12px rgba(0,0,0,0.5);
    }

    .header { 
      display: flex; justify-content: space-between; align-items: center;
      padding: 32px 24px 24px; gap: 16px; flex-wrap: wrap; 
    }
    .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(to right, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .status-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .status-badge { 
      padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
      background: var(--card-bg); border: 1px solid var(--border);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s;
    }
    .status-badge:hover { border-color: var(--text-dim); transform: translateY(-1px); }

    .grid { 
      display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px; padding: 0 24px 32px; 
    }
    .card { 
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px;
      padding: 24px; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    }
    .card:hover { 
      border-color: var(--border-hover); 
      transform: translateY(-4px); 
      box-shadow: 0 10px 20px -5px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.1);
    }
    .card .status-dot { 
      width: 10px; height: 10px; border-radius: 50%; display: inline-block; 
      margin-right: 10px; box-shadow: 0 0 8px currentColor;
    }
    .card .title { 
      font-size: 18px; font-weight: 600; margin-bottom: 16px; display: flex;
      align-items: center; justify-content: space-between; 
    }
    .card .info-row { 
      display: flex; justify-content: space-between; padding: 8px 0;
      font-size: 14px; color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .card .info-row:last-of-type { border-bottom: none; }
    .card .info-row span:last-child { color: var(--text); font-weight: 500; text-align: right; }
    
    .card .util-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; flex: 1; margin: 0 12px; }
    .card .util-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }

    .card .actions { 
      display: flex; gap: 8px; margin-top: 20px; padding-top: 16px;
      border-top: 1px solid var(--border); flex-wrap: wrap;
    }
    .card .actions button { 
      flex: 1; min-width: 60px; padding: 8px 12px; border-radius: 8px; 
      border: 1px solid var(--border); background: rgba(255,255,255,0.03); 
      color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500;
      transition: all 0.2s;
    }
    .card .actions button:hover { background: var(--border); border-color: var(--text-dim); }
    .card .actions button.danger:hover { background: var(--red-bg); border-color: var(--red); color: var(--red); }

    .btn-primary { 
      padding: 10px 20px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-hover)); 
      color: white; cursor: pointer; font-size: 14px; font-weight: 600; 
      box-shadow: 0 4px 12px rgba(59,130,246,0.3); transition: all 0.2s;
    }
    .btn-primary:hover { 
      transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.4); 
      filter: brightness(1.1);
    }
    .search-input { 
      padding: 10px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: rgba(24,24,27,0.8); color: var(--text); font-size: 14px; width: 240px; 
      transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }
    .search-input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 2px var(--accent-glow); }

    .modal-overlay { 
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 100; 
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal { 
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px;
      padding: 32px; max-width: 640px; width: 90%; max-height: 85vh; overflow-y: auto; 
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .modal h2 { margin-bottom: 24px; font-size: 24px; font-weight: 700; color: #fff; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: var(--text-dim); margin-bottom: 6px; }
    .form-group input, .form-group select, .form-group textarea { 
      width: 100%; padding: 10px 14px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 14px; 
      transition: all 0.2s; font-family: var(--font-main);
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .toggle-group { display: flex; gap: 20px; margin-top: 8px; flex-wrap: wrap; }
    .toggle-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text-dim); }
    .toggle-group input[type="checkbox"] { accent-color: var(--accent); width: 16px; height: 16px; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
    .modal-actions button:not(.btn-primary) {
      padding: 10px 20px; border-radius: 10px; border: 1px solid var(--border);
      background: transparent; color: var(--text); cursor: pointer; font-size: 14px; font-weight: 500;
      transition: all 0.2s;
    }
    .modal-actions button:not(.btn-primary):hover { background: var(--border); }
    
    .modal-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .close-x { 
      width: 32px; height: 32px; border-radius: 8px; border: none; background: rgba(255,255,255,0.05); 
      color: var(--text-dim); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; 
      transition: all 0.2s;
    }
    .close-x:hover { background: var(--red-bg); color: var(--red); }

    .ai-section { 
      background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); 
      border-radius: 12px; padding: 20px; margin-bottom: 24px; 
    }
    .ai-section .title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: var(--accent); display: flex; align-items: center; gap: 8px; }
    .ai-section textarea { border-color: rgba(59, 130, 246, 0.3); background: rgba(0,0,0,0.2); min-height: 100px; }
    .ai-section textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    
    .img-grid { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
    .img-grid .thumb { 
      width: 90px; height: 70px; border-radius: 8px; overflow: hidden; 
      position: relative; border: 2px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    .img-grid .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .img-grid .thumb .del { 
      position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; 
      border-radius: 50%; background: var(--red); color: #fff; border: none; 
      font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; 
      opacity: 0.8; transition: opacity 0.2s;
    }
    .img-grid .thumb .del:hover { opacity: 1; }

    .proxy-card { 
      padding: 16px; border: 1px solid var(--border); border-radius: 12px; 
      margin-bottom: 12px; background: var(--card-bg); display: flex; justify-content: space-between;
      align-items: center; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .proxy-card:hover { border-color: var(--border-hover); transform: translateX(4px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .proxy-card .proxy-name { font-weight: 600; font-size: 16px; margin-bottom: 6px; color: #fff; }
    .proxy-card .proxy-info { font-size: 13px; color: var(--text-dim); }
    .tag { 
      display: inline-block; padding: 4px 10px; border-radius: 6px;
      background: var(--accent-glow); color: #60a5fa; font-size: 12px; font-weight: 600; margin: 2px; 
    }
    
    .verify-step { 
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; 
      background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 4px;
    }
    .verify-step:last-child { border-bottom: none; }
    
    .ai-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: rgba(59,130,246,0.05); border-radius: 8px; }
    .ai-loading .spinner { width: 24px; height: 24px; border: 3px solid rgba(59,130,246,0.3); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    table { width:100%; border-collapse: separate; border-spacing: 0; font-size: 14px; }
    th { text-align:left; padding: 14px 16px; color: var(--text-dim); font-weight: 600; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); }
    th:first-child { border-top-left-radius: 12px; } th:last-child { border-top-right-radius: 12px; }
    td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text); }
    tr:hover td { background: rgba(255,255,255,0.02); }
    
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; padding: 0 16px 24px; }
      .header { flex-direction: column; align-items: stretch; padding: 24px 16px 16px; }
      .form-row { grid-template-columns: 1fr; gap: 0; }
      .nav { overflow-x: auto; white-space: nowrap; padding: 12px 16px; }
      .card .actions { flex-direction: column; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <button onclick="switchPage('servers')" id="nav-servers" class="active">🖥️ 服务器</button>
    <button onclick="switchPage('datasets')" id="nav-datasets">📦 数据集与预存</button>
    <button onclick="switchPage('proxies')" id="nav-proxies">🌐 代理池</button>
    <button onclick="switchPage('logs')" id="nav-logs">📋 使用记录</button>
  </nav>
  <div id="page-servers" class="page">
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        <h1>服务器集群</h1>
        <div class="status-bar" id="statusBar"></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input class="search-input" id="searchInput" placeholder="搜索名称/IP..." oninput="renderServers()">
        <button class="btn-primary" onclick="probeAll()">📡 全部探测</button>
        <button class="btn-primary" onclick="showAddServer()">+ 添加</button>
      </div>
    </div>
    <div id="sharingBar" style="margin:0 24px 12px;padding:12px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg);display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;margin-bottom:2px">GPU 均衡分配模式（全局统一切换）</div>
        <div id="sharingDesc" style="font-size:12px;color:var(--text-dim);line-height:1.5"></div>
      </div>
      <div class="toggle-switch" style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button id="modeSharedBtn" onclick="applyGlobalSharingMode('shared')" style="padding:8px 14px;border:none;cursor:pointer;background:transparent;color:var(--text);font-size:13px">🤝 共享（推理）</button>
        <button id="modeExclusiveBtn" onclick="applyGlobalSharingMode('exclusive')" style="padding:8px 14px;border:none;cursor:pointer;background:transparent;color:var(--text);font-size:13px">🔒 独占（训练）</button>
      </div>
    </div>
    <div class="grid" id="serverGrid"></div>
  </div>
  <div id="page-datasets" class="page" style="display:none">
    <div class="header">
      <div>
        <h1 style="display:flex;align-items:center;gap:8px">📦 集群数据集与备份索引大盘</h1>
        <p style="font-size:13px;color:var(--text-dim);margin-top:4px">
          查看与管理各算力机的<b>预存数据集 (Dataset Affinity)</b> 及 <b>RAG 向量备份索引库</b>。所有备份索引均以源机 IP 为唯一计量生命周期（若机器被删除，索引自动同步清理）。
        </p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn-primary" onclick="showRegisterDatasetModal()">+ 登记数据集</button>
        <button class="btn-primary" onclick="refreshDatasetsPage()" style="background:rgba(255,255,255,0.08)">🔄 全部刷新</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin:0 24px 20px;">
      <div style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:12px;color:var(--text-dim)">📊 预存数据集总数</div>
        <div id="datasetCountStat" style="font-size:24px;font-weight:700;color:var(--primary);margin-top:4px">0 个</div>
      </div>
      <div style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:12px;color:var(--text-dim)">💾 预估总存储占用</div>
        <div id="datasetSizeStat" style="font-size:24px;font-weight:700;color:var(--green);margin-top:4px">0 GB</div>
      </div>
      <div style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:12px;color:var(--text-dim)">🖥️ 覆盖算力节点</div>
        <div id="datasetServerStat" style="font-size:24px;font-weight:700;color:var(--yellow);margin-top:4px">0 台</div>
      </div>
      <div style="padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;">
        <div style="font-size:12px;color:var(--text-dim)">🗂️ RAG 备份索引记录</div>
        <div id="backupCountStat" style="font-size:24px;font-weight:700;color:#c084fc;margin-top:4px">0 条</div>
      </div>
    </div>

    <!-- Section 1: Pre-cached Datasets -->
    <div style="margin:0 24px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border);padding-bottom:12px">
      <div>
        <h2 style="font-size:18px;font-weight:600;display:flex;align-items:center;gap:6px">📁 算力节点预存数据集 (Affinity +100,000)</h2>
      </div>
      <input class="search-input" id="datasetSearchInput" placeholder="过滤数据集/路径/服务器..." oninput="renderDatasets()" style="min-width:240px">
    </div>
    <div class="grid" id="datasetGrid"></div>

    <!-- Section 2: Backup Indexes & RAG Vector Search -->
    <div style="margin:32px 24px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border);padding-bottom:12px">
      <div>
        <h2 style="font-size:18px;font-weight:600;display:flex;align-items:center;gap:6px">🗂️ 云端备份索引库与 RAG 语义检索 (IP 生命周期绑定)</h2>
        <p style="font-size:12px;color:var(--text-dim);margin-top:2px">当通过 <code>plan_server_backup</code> 备份时自动建库。支持输入自然语言或指标关键词进行 RAG 混合检索。</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input class="search-input" id="ragSearchInput" placeholder="🔍 RAG 语义搜索 (如: loss 0.18, 7b权重, 评估集)..." oninput="onRagSearchInput()" style="min-width:280px">
        <select id="backupTypeFilter" onchange="loadBackups()" style="padding:8px 12px;background:var(--card-bg);border:1px solid var(--border);color:var(--text);border-radius:8px;font-size:13px">
          <option value="">全部备份类型</option>
          <option value="google_drive">☁️ Google Drive</option>
          <option value="peer_server">🔄 对端中转</option>
          <option value="local_weights">📥 本地权重</option>
        </select>
      </div>
    </div>
    <div class="grid" id="backupIndexGrid"></div>
  </div>
  <div id="page-proxies" class="page" style="display:none">
    <div class="header">
      <h1>代理节点池</h1>
      <button class="btn-primary" onclick="showAddProxy()">+ 添加代理</button>
    </div>
    <div style="padding:0 24px 24px" id="proxyList"></div>
  </div>
  <div id="page-logs" class="page" style="display:none">
    <div class="header">
      <h1>使用记录</h1>
    </div>
    <div style="padding:0 24px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="color:var(--text-dim);border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:8px">时间</th>
          <th style="text-align:left;padding:8px">服务器</th>
          <th style="text-align:left;padding:8px">Agent</th>
          <th style="text-align:left;padding:8px">会话</th>
          <th style="text-align:left;padding:8px">操作</th>
        </tr></thead>
        <tbody id="logTableBody"></tbody>
      </table>
    </div>
  </div>
  <div id="modalContainer"></div>
  <script>
    let servers = [];
    let datasets = [];
    let backups = [];
    let proxies = [];
    let logs = [];
    let currentPage = 'servers';
    let ragSearchTimer = null;

    const API = {
      servers: () => fetch('/api/servers').then(r => r.json()),
      serverById: (id) => fetch('/api/servers/'+id).then(r => r.json()),
      createServer: (data) => fetch('/api/servers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      updateServer: (id, data) => fetch('/api/servers/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteServer: (id) => fetch('/api/servers/'+id, { method:'DELETE' }).then(r => r.json()),
      enableServer: (id) => fetch('/api/servers/'+id+'/enable', { method:'POST' }).then(r => r.json()),
      disableServer: (id) => fetch('/api/servers/'+id+'/disable', { method:'POST' }).then(r => r.json()),
      datasets: () => fetch('/api/servers/datasets/all').then(r => r.json()),
      registerDataset: (serverId, data) => fetch('/api/servers/'+serverId+'/datasets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      removeDataset: (serverId, name) => fetch('/api/servers/'+serverId+'/datasets/'+encodeURIComponent(name), { method:'DELETE' }).then(r => r.json()),
      backups: (q, type) => {
        let url = '/api/servers/backups/all?';
        if (q) url += 'q=' + encodeURIComponent(q) + '&';
        if (type) url += 'type=' + encodeURIComponent(type);
        return fetch(url).then(r => r.json());
      },
      deleteBackup: (id) => fetch('/api/servers/backups/' + id, { method:'DELETE' }).then(r => r.json()),
      proxies: () => fetch('/api/proxies').then(r => r.json()),
      createProxy: (data) => fetch('/api/proxies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteProxy: (id) => fetch('/api/proxies/'+id, { method:'DELETE' }).then(r => r.json()),
      logs: () => fetch('/api/usage').then(r => r.json()),
      recordUsage: (data) => fetch('/api/usage', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      claimServer: (id, agent, task, duration_minutes, server_expires_at) => fetch('/api/servers/'+id+'/claim', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({agent, task, duration_minutes, server_expires_at}) }).then(r => r.json()),
      setServerLease: (id, server_expires_at) => fetch('/api/servers/'+id+'/lease', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({server_expires_at}) }).then(r => r.json()),
      releaseServer: (id) => fetch('/api/servers/'+id+'/release', { method:'POST' }).then(r => r.json()),
      planBackup: (server_id, session_name, summary, has_google_drive, remote_data_dir) => fetch('/mcp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id: Date.now(), method:'tools/call', params:{name:'plan_server_backup', arguments:{server_id, session_name, summary, has_google_drive, remote_data_dir}}}) }).then(r => r.json()),
    };

    function switchPage(page) {
      currentPage = page;
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      document.getElementById('page-'+page).style.display = 'block';
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('nav-'+page).classList.add('active');
      if (page === 'servers') loadServers();
      else if (page === 'datasets') refreshDatasetsPage();
      else if (page === 'proxies') loadProxies();
      else if (page === 'logs') loadLogs();
    }

    async function loadServers() {
      try { servers = await API.servers(); renderServers(); }
      catch (e) { console.error('Failed to load servers', e); }
    }
    async function loadProxies() {
      try { proxies = await API.proxies(); renderProxies(); }
      catch (e) { console.error('Failed to load proxies', e); }
    }
    async function loadLogs() {
      try { logs = await API.logs(); renderLogs(); }
      catch (e) { console.error('Failed to load logs', e); }
    }

    function renderServers() {
      const search = (document.getElementById('searchInput').value || '').toLowerCase();
      const filtered = servers.filter(s => s.name.toLowerCase().includes(search) || s.host.includes(search));
      var isEnabled = function(s) { return s.enabled !== 0 && s.enabled !== false; };
      var online = filtered.filter(function(s){ return isEnabled(s) && s.status_online && wasRecentlyUsed(s); });
      var idle = filtered.filter(function(s){ return isEnabled(s) && s.status_online && !wasRecentlyUsed(s); });
      var offline = filtered.filter(function(s){ return isEnabled(s) && !s.status_online; });
      var disabled = filtered.filter(function(s){ return !isEnabled(s); });
      var statusBar = document.getElementById('statusBar');
      statusBar.innerHTML = '';
      [{label:'🟢 '+online.length},{label:'🟡 '+idle.length},{label:'🔴 '+offline.length},{label:'⚪ '+disabled.length+' 已禁用'}].forEach(function(c) {
        var badge = document.createElement('span'); badge.className = 'status-badge'; badge.textContent = c.label; statusBar.appendChild(badge);
      });
      var grid = document.getElementById('serverGrid');
      grid.innerHTML = '';
      [...online, ...idle, ...offline, ...disabled].forEach(function(s) { grid.appendChild(createServerCard(s)); });
      renderSharingBar();
    }

    // Reflect the fleet's GPU sharing mode and let the user flip every server at once.
    function renderSharingBar() {
      var gpuServers = servers.filter(function(s){ return s.gpu_count && s.gpu_count > 0; });
      var descEl = document.getElementById('sharingDesc');
      var sharedBtn = document.getElementById('modeSharedBtn');
      var exclBtn = document.getElementById('modeExclusiveBtn');
      if (!descEl || !sharedBtn || !exclBtn) return;
      var nShared = gpuServers.filter(function(s){ return (s.gpu_sharing_mode||'shared') === 'shared'; }).length;
      var nExcl = gpuServers.filter(function(s){ return s.gpu_sharing_mode === 'exclusive'; }).length;
      // Highlight the active side only when the whole GPU fleet agrees.
      var accent = '#2563eb';
      sharedBtn.style.background = (nExcl === 0 && nShared > 0) ? accent : 'transparent';
      sharedBtn.style.color = (nExcl === 0 && nShared > 0) ? '#fff' : 'var(--text)';
      exclBtn.style.background = (nShared === 0 && nExcl > 0) ? accent : 'transparent';
      exclBtn.style.color = (nShared === 0 && nExcl > 0) ? '#fff' : 'var(--text)';
      if (gpuServers.length === 0) {
        descEl.textContent = '当前没有已登记 GPU 的服务器。填好某台机器的 GPU 卡数后，这里即可统一切换分配模式。';
      } else {
        descEl.innerHTML = '<b>共享</b>：多任务按空闲显存挤在同一张卡上，适合推理/轻量任务；<b>独占</b>：一个任务占满整卡（空闲卡数 = 总卡数 − 运行任务数），适合训练。'
          + '<br>当前 ' + gpuServers.length + ' 台 GPU 机器中：共享 ' + nShared + ' 台、独占 ' + nExcl + ' 台。点右侧按钮可一键把全部 GPU 机器切到同一模式。';
      }
    }

    async function applyGlobalSharingMode(mode) {
      var gpuServers = servers.filter(function(s){ return s.gpu_count && s.gpu_count > 0; });
      var targets = gpuServers.filter(function(s){ return (s.gpu_sharing_mode||'shared') !== mode; });
      if (gpuServers.length === 0) { alert('当前没有已登记 GPU 的服务器，无法切换分配模式。'); return; }
      if (targets.length === 0) {
        var label = mode === 'shared' ? '共享' : '独占';
        alert('全部 GPU 服务器已经处于「' + label + '」模式。');
        return;
      }
      var modeLabel = mode === 'shared' ? '共享（推理）' : '独占（训练）';
      if (!confirm('将全部 ' + gpuServers.length + ' 台 GPU 服务器统一切换为「' + modeLabel + '」模式？（' + targets.length + ' 台需要更新）')) return;
      var sharedBtn = document.getElementById('modeSharedBtn');
      var exclBtn = document.getElementById('modeExclusiveBtn');
      if (sharedBtn) sharedBtn.disabled = true;
      if (exclBtn) exclBtn.disabled = true;
      try {
        var results = await Promise.all(targets.map(function(s){
          return API.updateServer(s.id, { gpu_sharing_mode: mode }).then(function(){ s.gpu_sharing_mode = mode; return true; }).catch(function(){ return false; });
        }));
        var ok = results.filter(Boolean).length;
        var fail = results.length - ok;
        renderSharingBar();
        renderServers();
        if (fail > 0) alert('已切换 ' + ok + ' 台，' + fail + ' 台失败，请重试。');
      } finally {
        if (sharedBtn) sharedBtn.disabled = false;
        if (exclBtn) exclBtn.disabled = false;
        loadServers();
      }
    }

    function wasRecentlyUsed(server) {
      return new Date(server.updated_at).getTime() > Date.now() - 5*60*1000;
    }

    function createServerCard(s) {
      const card = document.createElement('div'); card.className = 'card';
      var isEnabled = s.enabled !== 0 && s.enabled !== false;
      var isOnline = s.status_online;
      var dotColor = isOnline ? (wasRecentlyUsed(s) ? 'var(--green)' : 'var(--yellow)') : 'var(--red)';
      if (!isEnabled) card.style.opacity = '0.5';

      // Title row — safe textContent for user-controlled values
      const titleDiv = document.createElement('div'); titleDiv.className = 'title';
      const titleLeft = document.createElement('span');
      const dot = document.createElement('span'); dot.className = 'status-dot'; dot.style.background = dotColor;
      titleLeft.appendChild(dot);
      titleLeft.appendChild(document.createTextNode(s.name));
      titleDiv.appendChild(titleLeft);
      const statusSpan = document.createElement('span'); statusSpan.style.cssText = 'font-size:12px;color:var(--text-dim)';
      statusSpan.textContent = isOnline ? '在线' : '离线';
      titleDiv.appendChild(statusSpan);
      if (!isEnabled) {
        var disabledBadge = document.createElement('span'); disabledBadge.style.cssText = 'font-size:11px;padding:2px 6px;border-radius:4px;background:var(--border);color:var(--text-dim);margin-left:6px';
        disabledBadge.textContent = '已禁用';
        titleDiv.appendChild(disabledBadge);
      }
      card.appendChild(titleDiv);

      // Info rows
      function addInfoRow(label, value) {
        const row = document.createElement('div'); row.className = 'info-row';
        const labelSpan = document.createElement('span'); labelSpan.textContent = label;
        const valueSpan = document.createElement('span'); valueSpan.textContent = value;
        row.appendChild(labelSpan); row.appendChild(valueSpan);
        card.appendChild(row);
      }
      addInfoRow('地址', s.host+':'+s.port);
      addInfoRow('连接', (s.connection_type === 'cloudflare_tunnel') ? '☁️ CF隧道' : (s.connection_mode_label || '标准SSH'));
      addInfoRow('GPU', s.gpu_model||'N/A');
      if (s.gpu_count && s.gpu_count > 0) {
        addInfoRow('GPU分配', (s.gpu_sharing_mode === 'exclusive' ? '🔒 独占(训练)' : '🤝 共享(推理)') + ' · ' + s.gpu_count + '卡');
      }
      addInfoRow('CPU', s.cpu_cores?s.cpu_cores+'核':'N/A');
      addInfoRow('内存', s.ram_gb?s.ram_gb+'GB':'N/A');
      addInfoRow('Ping', s.status_ping_ms?s.status_ping_ms+'ms':'未探测');
      
      // Server physical lease display
      let leaseBadge = '';
      if (s.server_expires_at) {
        const sRem = Math.round((new Date(s.server_expires_at).getTime() - Date.now()) / 60000);
        if (sRem <= 0) {
          leaseBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(239,68,68,0.15);color:var(--red);font-size:11px;font-weight:600;">🛑 物理已到期 (' + (-sRem) + '分前)</span>';
        } else if (sRem <= 60) {
          leaseBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(249,115,22,0.2);color:#f97316;font-size:11px;font-weight:600;">⚠️ 物理临期: 剩余 ' + sRem + ' 分钟 (即将关机)</span>';
        } else {
          const hText = sRem >= 120 ? (sRem / 60).toFixed(1) + ' 小时' : sRem + ' 分钟';
          leaseBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(59,130,246,0.15);color:var(--blue);font-size:11px;font-weight:600;">🔋 物理租期剩余 ' + hText + '</span>';
        }
      } else {
        leaseBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(100,116,139,0.15);color:var(--text-dim);font-size:11px;">♾️ 物理租期: 永久/长期</span>';
      }
      addInfoRow('物理租期', leaseBadge);

      if (s.os_hint) addInfoRow('系统', s.os_hint);
      if (s.ssh_banner) {
        var ver = s.ssh_banner.match(/SSH-[\d.]+-([^\s]+)/);
        if (ver) addInfoRow('SSH', ver[1]);
      }

      // Task / occupancy display
      const isBusy = s.current_agent && s.current_task;
      if (isBusy) {
        const taskRow = document.createElement('div'); taskRow.className = 'info-row';
        taskRow.style.cssText = 'border-top:1px solid var(--border);padding-top:8px;margin-top:6px;flex-direction:column;align-items:flex-start;gap:4px;';
        
        let timerBadge = '';
        if (s.task_expires_at) {
          const rem = Math.round((new Date(s.task_expires_at).getTime() - Date.now())/60000);
          if (rem <= 0) {
            timerBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(239,68,68,0.15);color:var(--red);font-size:11px;font-weight:600;">⚠️ 任务倒计时已超时 (' + (-rem) + '分钟前到期)</span>';
          } else {
            timerBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(16,185,129,0.15);color:var(--green);font-size:11px;font-weight:600;">⏱️ 任务倒计时剩余 ' + rem + ' 分钟 (共 ' + (s.task_duration_minutes||rem) + '分)</span>';
          }
        } else {
          timerBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:rgba(100,116,139,0.15);color:var(--text-dim);font-size:11px;">♾️ 不限时任务</span>';
        }

        let startInfo = '';
        if (s.task_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(s.task_started_at).getTime())/60000);
          startInfo = ' <span style="font-size:11px;color:var(--text-dim)">(' + elapsed + '分钟前启动)</span>';
        }

        taskRow.innerHTML = '<div style="display:flex;justify-content:space-between;width:100%;align-items:center;">' +
          '<span style="color:var(--yellow);font-weight:600;font-size:12px;">📋 ' + escHtml(s.current_agent) + ' → ' + escHtml(s.current_task) + startInfo + '</span>' +
          '</div>' +
          '<div style="margin-top:2px;">' + timerBadge + '</div>';
        card.appendChild(taskRow);
      }

      // Actions row
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions';
      const addActionBtn = (label, clickFn, extraClass) => {
        const btn = document.createElement('button'); btn.textContent = label;
        if (extraClass) btn.className = extraClass;
        btn.onclick = clickFn; actionsDiv.appendChild(btn);
      };
      addActionBtn(isBusy ? '⏱️ 计时/任务' : '⏱️ 任务/计时', () => showTaskTimerModal(s.id));
      if (isBusy) {
        addActionBtn('🛑 释放', function() {
          if (confirm('确定释放服务器 ' + s.name + ' 的占用？')) {
            API.releaseServer(s.id).then(loadServers);
          }
        }, 'danger');
      }
      addActionBtn('详情', () => showServerDetail(s.id));
      addActionBtn('编辑', () => showEditServer(s.id));
      addActionBtn('探测', () => probeServer(s.id));
      addActionBtn('删除', () => deleteServerConfirm(s.id), 'danger');
      if (isEnabled) {
        addActionBtn('禁用', function() { API.disableServer(s.id).then(loadServers); });
      } else {
        addActionBtn('启用', function() { API.enableServer(s.id).then(loadServers); });
      }
      card.appendChild(actionsDiv);

      return card;
    }

    async function deleteServerConfirm(id) {
      const s = servers.find(x => x.id === id);
      const name = s ? s.name : id;
      const host = s ? s.host : '';
      if (confirm('确定永久删除服务器 [' + name + ' (' + host + ')] 吗？\\n注意：该操作将同时自动清理该 IP 下的所有备份索引记录！')) {
        try {
          const res = await API.deleteServer(id);
          if (res && res.success !== false) {
            showToast('✔ 服务器已成功删除', 'success');
            loadServers();
          } else {
            showToast('删除失败: ' + (res && res.error ? res.error : '未知错误'), 'error');
          }
        } catch (e) {
          showToast('网络错误: ' + e.message, 'error');
        }
      }
    }

    async function deleteProxyConfirm(id) {
      const p = proxies.find(x => x.id === id);
      const name = p ? p.name : id;
      if (confirm('确定删除代理节点 [' + name + '] 吗？')) {
        try {
          const res = await API.deleteProxy(id);
          if (res && res.success !== false) {
            showToast('✔ 代理节点已成功删除', 'success');
            loadProxies();
          } else {
            showToast('删除失败: ' + (res && res.error ? res.error : '未知错误'), 'error');
          }
        } catch (e) {
          showToast('网络错误: ' + e.message, 'error');
        }
      }
    }

    async function refreshDatasetsPage() {
      await Promise.all([loadServers(), loadDatasets(), loadBackups()]);
    }

    function onRagSearchInput() {
      if (ragSearchTimer) clearTimeout(ragSearchTimer);
      ragSearchTimer = setTimeout(function() {
        loadBackups();
      }, 300);
    }

    async function loadBackups() {
      try {
        const qInput = document.getElementById('ragSearchInput');
        const q = (qInput ? qInput.value : '').trim();
        const typeSelect = document.getElementById('backupTypeFilter');
        const type = (typeSelect ? typeSelect.value : '').trim();
        backups = await API.backups(q, type);
        if (!Array.isArray(backups)) backups = [];
        renderBackups();
      } catch (e) {
        console.error('Failed to load backups', e);
        backups = [];
        renderBackups();
      }
    }

    function renderBackups() {
      const bEl = document.getElementById('backupCountStat');
      if (bEl) bEl.textContent = backups.length + ' 条';

      const container = document.getElementById('backupIndexGrid');
      if (!container) return;
      container.innerHTML = '';

      if (backups.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'grid-column:1/-1;padding:36px 24px;text-align:center;background:var(--card-bg);border:1px dashed var(--border);border-radius:16px;';
        emptyDiv.innerHTML = '<div style="font-size:32px;margin-bottom:8px">🗂️</div>' +
          '<div style="font-size:15px;font-weight:600;margin-bottom:4px">暂无匹配的备份索引记录</div>' +
          '<div style="font-size:13px;color:var(--text-dim);max-width:520px;margin:0 auto;line-height:1.5">当执行 <code>plan_server_backup</code> 完成阶段性产物或权重备份时，系统将自动以源机 IP 为唯一锚点登记至此；当机器被删除时，关联索引将随之一同清理。</div>';
        container.appendChild(emptyDiv);
        return;
      }

      const typeMeta = {
        google_drive: { icon: '☁️', label: 'Google Drive 全量', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
        peer_server: { icon: '🔄', label: '对端中转存储', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
        local_weights: { icon: '📥', label: '本地核心产物', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
      };

      backups.forEach(function(b) {
        const card = document.createElement('div');
        card.className = 'card';

        const tm = typeMeta[b.backup_type] || { icon: '📦', label: b.backup_type, color: 'var(--text)', bg: 'rgba(255,255,255,0.1)' };

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.innerHTML = '<span>' + tm.icon + ' <b style="color:var(--text)">' + escHtml(b.summary) + '</b></span>' +
          '<span style="font-size:12px;padding:3px 8px;border-radius:6px;background:' + tm.bg + ';color:' + tm.color + ';font-weight:600">' + tm.label + (b.score ? ' · 匹配 ' + b.score + '分' : '') + '</span>';
        card.appendChild(titleDiv);

        // Info rows
        const addRow = function(label, valHtml) {
          const row = document.createElement('div'); row.className = 'info-row';
          const lbl = document.createElement('span'); lbl.textContent = label;
          const val = document.createElement('span'); val.innerHTML = valHtml;
          row.appendChild(lbl); row.appendChild(val);
          card.appendChild(row);
        };

        addRow('源服务器 IP', '<code style="font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">🔗 ' + escHtml(b.server_host) + '</code>');
        addRow('任务会话', '<b>' + escHtml(b.session_name) + '</b>');
        addRow('存储路径', '<code style="font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;word-break:break-all">' + escHtml(b.remote_path) + '</code>');
        if (b.peer_server_host) {
          addRow('对端节点 IP', '<b>' + escHtml(b.peer_server_host) + '</b>');
        }
        if (b.purpose) addRow('数据用途', escHtml(b.purpose));
        if (b.usage_status) addRow('使用状态', escHtml(b.usage_status));
        if (b.relevance_reasons && b.relevance_reasons.length > 0) {
          addRow('RAG 匹配', '<span style="color:#c084fc">' + escHtml(b.relevance_reasons.join(', ')) + '</span>');
        }
        if (b.created_at) {
          const dt = new Date(b.created_at);
          addRow('备份时间', dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';

        if (b.peer_connect_cmd) {
          const connBtn = document.createElement('button');
          connBtn.textContent = '📋 复制连接指令';
          connBtn.onclick = function() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(b.peer_connect_cmd).then(function() {
                showToast('✔ 对端 SSH 连接指令已复制', 'success');
              });
            } else {
              prompt('复制连接指令:', b.peer_connect_cmd);
            }
          };
          actionsDiv.appendChild(connBtn);
        }

        const copyPathBtn = document.createElement('button');
        copyPathBtn.textContent = '📁 复制路径';
        copyPathBtn.onclick = function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(b.remote_path).then(function() {
              showToast('✔ 存储路径已复制', 'success');
            });
          } else {
            prompt('复制路径:', b.remote_path);
          }
        };
        actionsDiv.appendChild(copyPathBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger';
        delBtn.textContent = '🗑️ 删除索引';
        delBtn.onclick = async function() {
          if (confirm('确定从 RAG 库中删除此备份索引（' + b.summary + '）？')) {
            try {
              const res = await API.deleteBackup(b.id);
              if (res.success) {
                showToast('✔ 备份索引已删除', 'success');
                loadBackups();
              } else {
                showToast('删除失败', 'error');
              }
            } catch (err) {
              showToast('网络错误: ' + err.message, 'error');
            }
          }
        };
        actionsDiv.appendChild(delBtn);

        card.appendChild(actionsDiv);
        container.appendChild(card);
      });
    }

    async function loadDatasets() {
      try {
        datasets = await API.datasets();
        if (!Array.isArray(datasets)) datasets = [];
        renderDatasets();
      } catch (e) {
        console.error('Failed to load datasets', e);
        datasets = [];
        renderDatasets();
      }
    }

    function renderDatasets() {
      const searchInput = document.getElementById('datasetSearchInput');
      const search = (searchInput ? searchInput.value : '').toLowerCase();
      const filtered = datasets.filter(function(d) {
        return (d.name && d.name.toLowerCase().includes(search)) ||
          (d.path && d.path.toLowerCase().includes(search)) ||
          (d.server_name && d.server_name.toLowerCase().includes(search)) ||
          (d.server_host && d.server_host.includes(search)) ||
          (d.description && d.description.toLowerCase().includes(search));
      });

      // Update stats
      const totalCount = filtered.length;
      let totalSize = 0;
      filtered.forEach(function(d) { totalSize += (d.size_gb || 0); });
      const uniqueServers = new Set(filtered.map(function(d) { return d.server_id; })).size;

      const cEl = document.getElementById('datasetCountStat');
      if (cEl) cEl.textContent = totalCount + ' 个';
      const sEl = document.getElementById('datasetSizeStat');
      if (sEl) sEl.textContent = totalSize.toFixed(1) + ' GB';
      const uEl = document.getElementById('datasetServerStat');
      if (uEl) uEl.textContent = uniqueServers + ' 台';

      const container = document.getElementById('datasetGrid');
      if (!container) return;
      container.innerHTML = '';

      if (filtered.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'grid-column:1/-1;padding:48px 24px;text-align:center;background:var(--card-bg);border:1px dashed var(--border);border-radius:16px;';
        emptyDiv.innerHTML = '<div style="font-size:36px;margin-bottom:12px">📦</div>' +
          '<div style="font-size:16px;font-weight:600;margin-bottom:6px">暂无已登记的数据集</div>' +
          '<div style="font-size:13px;color:var(--text-dim);max-width:500px;margin:0 auto 16px;line-height:1.5">当 Agent 在算力机上完成数据下载或挂载后，调用 <code>register_dataset</code> 自动登记；或点击下方按钮手动登记，即可实现多任务 Dataset Affinity 亲和就近调度。</div>';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-primary';
        addBtn.textContent = '+ 立即登记第一个数据集';
        addBtn.onclick = showRegisterDatasetModal;
        emptyDiv.appendChild(addBtn);
        container.appendChild(emptyDiv);
        return;
      }

      filtered.forEach(function(d) {
        const card = document.createElement('div');
        card.className = 'card';

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.innerHTML = '<span>📦 <b style="color:var(--text)">' + escHtml(d.name) + '</b></span>' +
          '<span style="font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(59,130,246,0.15);color:var(--primary);font-weight:600">' + (d.size_gb > 0 ? d.size_gb + ' GB' : '未标大小') + '</span>';
        card.appendChild(titleDiv);

        // Info rows
        const addRow = function(label, valHtml) {
          const row = document.createElement('div'); row.className = 'info-row';
          const lbl = document.createElement('span'); lbl.textContent = label;
          const val = document.createElement('span'); val.innerHTML = valHtml;
          row.appendChild(lbl); row.appendChild(val);
          card.appendChild(row);
        };

        const serverStatusBadge = d.status_online ? '<span style="color:var(--green)">🟢</span>' : '<span style="color:var(--red)">🔴</span>';
        addRow('所在服务器', serverStatusBadge + ' <b>' + escHtml(d.server_name) + '</b> (' + escHtml(d.server_host) + ':' + d.server_port + ')');
        addRow('远端路径', '<code style="font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;word-break:break-all">' + escHtml(d.path) + '</code>');
        if (d.description) addRow('用途描述', escHtml(d.description));
        if (d.added_at) {
          const dt = new Date(d.added_at);
          addRow('登记时间', dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 复制亲和参数';
        copyBtn.onclick = function() {
          const snippet = 'preferred_datasets: ["' + d.name + '"]';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(snippet).then(function() {
              showToast('✔ 亲和参数已复制到剪贴板！可直接粘贴到 plan_task_allocation', 'success');
            }).catch(function() {
              prompt('请手动复制亲和参数:', snippet);
            });
          } else {
            prompt('请手动复制亲和参数:', snippet);
          }
        };
        actionsDiv.appendChild(copyBtn);

        const copyPathBtn = document.createElement('button');
        copyPathBtn.textContent = '📁 复制路径';
        copyPathBtn.onclick = function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(d.path).then(function() {
              showToast('✔ 远端路径已复制', 'success');
            });
          } else {
            prompt('请手动复制路径:', d.path);
          }
        };
        actionsDiv.appendChild(copyPathBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger';
        delBtn.textContent = '🗑️ 移除登记';
        delBtn.onclick = async function() {
          if (confirm('确定从服务器 [' + d.server_name + '] 移除数据集 [' + d.name + '] 的登记？')) {
            try {
              const res = await API.removeDataset(d.server_id, d.name);
              if (res.success) {
                showToast('✔ 数据集已成功移除登记', 'success');
                loadDatasets();
              } else {
                showToast('移除失败: ' + (res.error || '未知错误'), 'error');
              }
            } catch (err) {
              showToast('网络错误: ' + err.message, 'error');
            }
          }
        };
        actionsDiv.appendChild(delBtn);

        card.appendChild(actionsDiv);
        container.appendChild(card);
      });
    }

    function showRegisterDatasetModal() {
      if (!servers || servers.length === 0) {
        showToast('请先添加至少一台服务器', 'error');
        return;
      }
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = '📦 登记新数据集 (Dataset Affinity)';
      modalContent.appendChild(h2);

      const desc = document.createElement('p');
      desc.style.cssText = 'color:var(--text-dim);font-size:13px;margin-bottom:16px;line-height:1.5;';
      desc.textContent = '登记服务器上已存在或已下载完成的数据集。在 plan_task_allocation 多任务编排时，包含此数据集的任务将自动优先调度到该机器上。';
      modalContent.appendChild(desc);

      function addFormGroup(label, inputHtml) {
        const g = document.createElement('div'); g.className = 'form-group';
        const l = document.createElement('label'); l.textContent = label; g.appendChild(l);
        const w = document.createElement('div'); w.innerHTML = inputHtml; g.appendChild(w.firstChild);
        modalContent.appendChild(g);
      }

      // Server select
      let sOptions = '';
      servers.forEach(function(s) {
        sOptions += '<option value="' + s.id + '">' + escHtml(s.name) + ' (' + escHtml(s.host) + (s.status_online ? ' · 在线' : ' · 离线') + ')</option>';
      });
      addFormGroup('目标服务器', '<select id="ds-server">' + sOptions + '</select>');
      addFormGroup('数据集名称 (短名称)', '<input id="ds-name" type="text" placeholder="例如: openorca, math_dataset, qwen_base">');
      addFormGroup('服务器绝对路径', '<input id="ds-path" type="text" placeholder="例如: /data/datasets/openorca 或 /root/models/qwen">');
      addFormGroup('预估大小 (GB)', '<input id="ds-size" type="number" step="0.1" min="0" placeholder="例如: 25.5">');
      addFormGroup('用途与描述', '<input id="ds-desc" type="text" placeholder="例如: 中英文指令微调混合数据集">');

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'modal-actions';
      actionsDiv.style.marginTop = '24px';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = '🚀 确认登记';
      saveBtn.onclick = async function() {
        const sId = document.getElementById('ds-server').value;
        const nameVal = document.getElementById('ds-name').value.trim();
        const pathVal = document.getElementById('ds-path').value.trim();
        const sizeVal = parseFloat(document.getElementById('ds-size').value) || 0;
        const descVal = document.getElementById('ds-desc').value.trim();

        if (!nameVal) { showToast('请填写数据集名称', 'error'); return; }
        if (!pathVal) { showToast('请填写服务器绝对路径', 'error'); return; }

        saveBtn.disabled = true; saveBtn.textContent = '登记中...';
        try {
          const res = await API.registerDataset(sId, {
            name: nameVal,
            path: pathVal,
            size_gb: sizeVal,
            description: descVal
          });
          if (res.success) {
            showToast('✔ 成功登记数据集！', 'success');
            closeModal();
            loadDatasets();
          } else {
            showToast('登记失败: ' + (res.error || '未知错误'), 'error');
            saveBtn.disabled = false; saveBtn.textContent = '确认登记';
          }
        } catch (e) {
          showToast('网络错误: ' + e.message, 'error');
          saveBtn.disabled = false; saveBtn.textContent = '确认登记';
        }
      };
      actionsDiv.appendChild(saveBtn);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-secondary';
      closeBtn.textContent = '取消';
      closeBtn.onclick = closeModal;
      actionsDiv.appendChild(closeBtn);

      modalContent.appendChild(actionsDiv);
      showModalWithElement(modalContent);
    }

    function renderProxies() {
      const container = document.getElementById('proxyList'); container.innerHTML = '';
      proxies.forEach(p => {
        const div = document.createElement('div'); div.className = 'proxy-card';
        const nameDiv = document.createElement('div'); nameDiv.className = 'proxy-name'; nameDiv.textContent = p.name;
        div.appendChild(nameDiv);
        const infoDiv = document.createElement('div'); infoDiv.className = 'proxy-info';
        infoDiv.textContent = p.protocol+'://'+p.host+':'+p.port+(p.location?' · '+p.location:'');
        div.appendChild(infoDiv);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions'; actionsDiv.style.marginTop = '8px';
        const delBtn = document.createElement('button'); delBtn.textContent = '删除';
        delBtn.onclick = () => deleteProxyConfirm(p.id);
        actionsDiv.appendChild(delBtn);
        div.appendChild(actionsDiv);
        container.appendChild(div);
      });
      if (proxies.length===0) {
        const emptyP = document.createElement('p');
        emptyP.style.cssText = 'color:var(--text-dim);padding:24px;text-align:center';
        emptyP.textContent = '暂无代理节点';
        container.appendChild(emptyP);
      }
    }

    function renderLogs() {
      const tbody = document.getElementById('logTableBody'); tbody.innerHTML = '';
      logs.forEach(l => {
        const tr = document.createElement('tr'); tr.style.borderBottom = '1px solid var(--border)';
        const addTd = (content, extraStyle) => {
          const td = document.createElement('td'); td.style.padding = '8px';
          if (extraStyle) td.style.cssText += extraStyle;
          td.textContent = content; tr.appendChild(td);
        };
        addTd(new Date(l.called_at).toLocaleString(), 'font-size:13px');
        addTd(l.server_id.substring(0,8)+'...');
        addTd(l.agent_id);
        addTd(l.session_id.substring(0,12)+'...', 'font-size:13px;color:var(--text-dim)');
        const tdAction = document.createElement('td'); tdAction.style.padding = '8px';
        const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = l.action;
        tdAction.appendChild(tag); tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });
    }

    async function probeAll() { for (const s of servers) await probeServer(s.id); }

    async function probeServer(id) {
      showToast('⏳ 正在探测...');
      var s = servers.find(function(x){ return x.id === id; });
      var name = s ? s.name : id.substring(0,8);
      try {
        const resp = await fetch('/api/servers/probe/'+id, { method:'POST' });
        const result = await resp.json();
        if (result.success) {
          var ms = result.latency_ms;
          var msText = (ms !== null && ms !== undefined) ? ms+'ms' : '超时';
          if (result.reachable) {
            showToast('✅ ' + name + ' ' + msText, 'success');
          } else {
            showToast('⚠️ ' + name + ' 不可达 (' + msText + ') ' + (result.error||''), 'error');
          }
          loadServers();
        } else {
          showToast('❌ 探测失败: ' + (result.error || '未知错误'), 'error');
        }
      } catch(e) {
        showToast('❌ 探测失败: ' + e.message, 'error');
      }
    }

    function showModal(html) {
      // HTML modals: prepend X button, wrap content, no overlay-close
      var xBtn = '<button class="close-x" onclick="closeModal()">x</button>';
      // Find first heading and put X next to it, or put X at the top
      var content = html;
      // If starts with an h2, put X on the same line
      if (html.indexOf('<h2>') === 0) {
        var endH2 = html.indexOf('</h2>');
        var h2Content = html.substring(4, endH2);
        var rest = html.substring(endH2 + 5);
        content = '<div class="modal-title-bar"><h2 style="margin-bottom:0">' + h2Content + '</h2>' + xBtn + '</div>' + rest;
      } else {
        content = '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">' + xBtn + '</div>' + html;
      }
      document.getElementById('modalContainer').innerHTML = '<div class="modal-overlay"><div class="modal">' + content + '</div></div>';
    }
    function showModalWithElement(contentEl) {
      const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
      // overlay click does NOT close — only X or submit closes
      const modal = document.createElement('div'); modal.className = 'modal';
      // Prepend X button
      const xDiv = document.createElement('div'); xDiv.style.cssText = 'display:flex;justify-content:flex-end';
      const xBtn = document.createElement('button'); xBtn.className = 'close-x'; xBtn.textContent = 'x';
      xBtn.onclick = closeModal;
      xDiv.appendChild(xBtn);
      modal.appendChild(xDiv);
      modal.appendChild(contentEl);
      overlay.appendChild(modal);
      const container = document.getElementById('modalContainer'); container.innerHTML = '';
      container.appendChild(overlay);
    }
    function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

    // === Image state for the add-server form ===
    var pendingImages = [];

    // === Global paste: redirect to open the add-server form ===
    document.addEventListener('paste', function(e) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // If the add-server form is already open, add images to it
      if (document.getElementById('add-host')) {
        // Form is already open — send images there
        for (var i = 0; i < e.clipboardData.items.length; i++) {
          var item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            addImageFromBlob(item.getAsFile());
          }
        }
      } else {
        // Open the form and paste text if available
        var pasteText = e.clipboardData.getData('text');
        showAddServerWithText(pasteText || '');
        // Also handle images
        for (var i = 0; i < e.clipboardData.items.length; i++) {
          var item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            setTimeout(function(blob){ addImageFromBlob(blob); }, 100, item.getAsFile());
          }
        }
      }
      e.preventDefault();
    });

    function addImageFromBlob(blob) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        pendingImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
        renderImageThumbs();
      };
      reader.readAsDataURL(blob);
    }

    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function showToast(msg, type) {
      var existing = document.getElementById('dsh-toast');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.id = 'dsh-toast';
      toast.textContent = msg;
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity 0.3s;max-width:90%;text-align:center;' +
        (type==='error'?'background:#ef4444;color:#fff;':type==='success'?'background:#22c55e;color:#fff;':'background:var(--card-bg);color:var(--text);border:1px solid var(--border);');
      document.body.appendChild(toast);
      setTimeout(function(){ toast.style.opacity = '0'; setTimeout(function(){ toast.remove(); }, 300); }, type==='error'?4000:2000);
    }

    function showAddServerWithText(initialText) {
      showAddServer();
      if (initialText) {
        var ta = document.getElementById('ai-text');
        if (ta) { ta.value = initialText; }
      }
    }

    function renderImageThumbs() {
      var grid = document.getElementById('img-grid');
      if (!grid) return;
      grid.innerHTML = '';
      for (var i = 0; i < pendingImages.length; i++) {
        (function(idx) {
          var thumb = document.createElement('div'); thumb.className = 'thumb';
          var img = document.createElement('img');
          img.src = 'data:' + pendingImages[idx].mime_type + ';base64,' + pendingImages[idx].base64;
          var del = document.createElement('button'); del.className = 'del'; del.textContent = 'x';
          del.onclick = function() { pendingImages.splice(idx, 1); renderImageThumbs(); };
          thumb.appendChild(img); thumb.appendChild(del); grid.appendChild(thumb);
        })(i);
      }
    }

    function runAiExtract() {
      var text = document.getElementById('ai-text') ? document.getElementById('ai-text').value.trim() : '';
      var statusDiv = document.getElementById('ai-status');
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 正在识别服务器信息...</span></div>';

      if (!text && pendingImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">请粘贴文本或上传图片后再提取</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingImages.length > 0) body.images = pendingImages;

      fetch('/api/ai/extract-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          fillFormWithAI(result.data);
          statusDiv.innerHTML = '<p style="color:var(--green)">✅ AI 识别完成，已自动填充表单</p>';
        } else {
          statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + (result.error || 'AI 识别失败') + '</p>';
        }
      })
      .catch(function(err) {
        statusDiv.innerHTML = '<p style="color:var(--red)">❌ 网络错误: ' + err.message + '</p>';
      });
    }

    function fillFormWithAI(d) {
      function setVal(id, val) {
        var el = document.getElementById(id);
        if (el) el.value = (val !== undefined && val !== null) ? String(val) : '';
      }
      setVal('add-name', d.name || d.host || '');
      setVal('add-host', d.host || '');
      setVal('add-port', d.port || 22);
      setVal('add-user', d.username || 'root');
      setVal('add-gpu', d.gpu_model || '');
      setVal('add-gpu-mem', d.gpu_memory_gb || '');
      setVal('add-cpu', d.cpu_cores || '');
      setVal('add-ram', d.ram_gb || '');
      if (d.vendor_url) setVal('add-vendor-url', d.vendor_url);
      if (d.notes) setVal('add-notes', d.notes);

      // Handle auth: backend already normalized auth_method from the actual credential.
      var authSel = document.getElementById('add-auth-method');
      if (d.auth_method === 'key') {
        if (authSel) authSel.value = 'key';
        if (d.key_content) { showKeyContent(d.key_content); }
        else { window._aiKeyContent = null; triggerAuthChange(); }
      } else if (d.auth_method === 'password') {
        if (authSel) authSel.value = 'password';
        showPasswordField(d.password || '');
      } else if (authSel && d.auth_method) {
        authSel.value = d.auth_method; triggerAuthChange();
      }
    }

    function showKeyContent(keyContent) {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      c.innerHTML = '<div class="form-group"><label>SSH密钥内容</label><textarea id="add-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px">' + escHtml(keyContent) + '</textarea></div>';
      // Store for later use when switching auth methods
      window._aiKeyContent = keyContent;
    }

    function showPasswordField(password) {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      c.innerHTML = '<div class="form-group"><label>密码</label><input id="add-password" type="password" value="' + escHtml(password) + '"></div>';
      window._aiKeyContent = null;
    }

    function showAddServer() {
      pendingImages = [];
      showModal(
        '<h2>📋 添加服务器</h2>' +
        // Unified AI input section
        '<div class="ai-section">' +
        '  <div class="title">🤖 AI 智能导入 — 粘贴文本/截图或直接输入</div>' +
        '  <textarea id="ai-text" placeholder="在此粘贴服务器配置文本（IP、SSH密钥、GPU信息等），也可以按 Ctrl+V 粘贴截图，文本和图片一起发送给 AI 识别..."></textarea>' +
        '  <div class="img-grid" id="img-grid"></div>' +
        '  <div id="ai-status" style="margin-top:8px"></div>' +
        '  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '    <button class="btn-primary" onclick="pickServerImage()">📷 选择截图</button>' +
        '    <button class="btn-primary" onclick="runAiExtract()">🤖 AI 提取</button>' +
        '  </div>' +
        '  <input type="file" accept="image/*" multiple style="display:none" id="img-input" onchange="handleImageFiles(this)">' +
        '</div>' +
        // Form section
        '<div class="form-group"><label>名称</label><input id="add-name" placeholder="my-gpu-server"></div>' +
        '<div id="conn-standard-row"><div class="form-row"><div class="form-group"><label>地址</label><input id="add-host" placeholder="192.168.1.100"></div><div class="form-group"><label>SSH端口</label><input id="add-port" value="22"></div></div></div>' +
        '<div id="conn-tunnel-row" style="display:none"><div class="form-group"><label>隧道域名</label><input id="add-tunnel-host" placeholder="ssh.example.com"></div><div class="form-group" style="margin-top:6px;padding:8px 12px;border-radius:6px;border:1px dashed var(--border);font-size:12px;color:var(--text-2)">☁️ 客户机需先安装 cloudflared 并执行 <code>cloudflared login</code>，连接时用 <code>ssh -o ProxyCommand="cloudflared access ssh --hostname %h" user@隧道域名</code></div></div>' +
        '<div class="form-row"><div class="form-group"><label>用户名</label><input id="add-user" value="root"></div><div class="form-group"><label>认证</label><select id="add-auth-method"><option value="key">SSH密钥</option><option value="password">密码</option></select></div></div>' +
        '<div id="auth-fields"><div class="form-group"><label>密钥路径</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>GPU型号</label><input id="add-gpu" placeholder="NVIDIA A100"></div><div class="form-group"><label>显存GB</label><input id="add-gpu-mem" type="number"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>CPU核数</label><input id="add-cpu" type="number"></div><div class="form-group"><label>内存GB</label><input id="add-ram" type="number"></div></div>' +
        '<div class="form-group"><label>厂商URL</label><input id="add-vendor-url" placeholder="https://cloud.example.com"></div>' +
        '<div class="form-group"><label>备注</label><textarea id="add-notes" rows="2" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:13px;resize:vertical" placeholder="服务器的用途、注意事项等"></textarea></div>' +
        '<div style="margin:12px 0"><strong>连接方式</strong></div>' +
        '<div class="form-group"><label>连接形式</label><select id="add-connection-type"><option value="standard">标准SSH（直连/代理）</option><option value="cloudflare_tunnel">Cloudflare隧道（cloudflared access ssh）</option></select></div>' +
        '<div id="conn-standard-toggles" class="toggle-group"><label><input type="checkbox" id="add-v2ray"> 有V2RayN</label><label><input type="checkbox" id="add-direct-proxy" checked> V2RayN时可直连</label><label><input type="checkbox" id="add-direct-no-proxy"> 无代理时直连</label></div>' +
        '<div id="verify-results" style="margin-top:12px"></div>' +
        '<div class="modal-actions"><button class="btn-primary" onclick="verifyAndSave()">验证并保存</button><button onclick="closeModal()">取消</button></div>'
      );

      // Wire up paste on the textarea to capture images
      var textarea = document.getElementById('ai-text');
      if (textarea) {
        textarea.onpaste = function(e) {
          var hasImage = false;
          for (var i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
              hasImage = true;
              addImageFromBlob(e.clipboardData.items[i].getAsFile());
            }
          }
          // If there was an image, prevent the default (don't paste binary junk into textarea)
          if (hasImage) e.preventDefault();
        };
      }

      // Wire up auth method toggle + connection type toggle
      document.getElementById('add-auth-method').onchange = triggerAuthChange;
      document.getElementById('add-connection-type').onchange = triggerConnTypeChange;
    }

    function triggerConnTypeChange() {
      var sel = document.getElementById('add-connection-type');
      var isTunnel = sel && sel.value === 'cloudflare_tunnel';
      var stdRow = document.getElementById('conn-standard-row');
      var tunnelRow = document.getElementById('conn-tunnel-row');
      var toggles = document.getElementById('conn-standard-toggles');
      if (stdRow) stdRow.style.display = isTunnel ? 'none' : '';
      if (tunnelRow) tunnelRow.style.display = isTunnel ? '' : 'none';
      if (toggles) toggles.style.display = isTunnel ? 'none' : '';
    }

    function editToggleConnType() {
      var sel = document.getElementById('edit-connection-type');
      var isTunnel = sel && sel.value === 'cloudflare_tunnel';
      var toggles = document.getElementById('edit-conn-standard-toggles');
      var hint = document.getElementById('edit-conn-tunnel-hint');
      if (toggles) toggles.style.display = isTunnel ? 'none' : '';
      if (hint) hint.style.display = isTunnel ? '' : 'none';
    }

    function triggerAuthChange() {
      var c = document.getElementById('auth-fields');
      if (!c) return;
      var sel = document.getElementById('add-auth-method');
      if (sel.value === 'key') {
        // If AI previously extracted a key, show it in a textarea
        if (window._aiKeyContent) {
          showKeyContent(window._aiKeyContent);
        } else {
          c.innerHTML = '<div class="form-group"><label>密钥路径</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div>';
        }
      } else {
        c.innerHTML = '<div class="form-group"><label>密码</label><input id="add-password" type="password"></div>';
      }
    }

    function handleImageFiles(input) {
      if (!input.files || input.files.length === 0) return;
      for (var i = 0; i < input.files.length; i++) {
        (function(blob) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            pendingImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
            renderImageThumbs();
          };
          reader.readAsDataURL(blob);
        })(input.files[i]);
      }
      input.value = '';
    }

    async function verifyAndSave() {
      var connTypeSel = document.getElementById('add-connection-type');
      var isTunnel = connTypeSel && connTypeSel.value === 'cloudflare_tunnel';
      var host = isTunnel
        ? document.getElementById('add-tunnel-host').value
        : document.getElementById('add-host').value;
      var port = isTunnel ? 22 : (parseInt(document.getElementById('add-port').value) || 22);
      const resultsDiv = document.getElementById('verify-results');
      resultsDiv.textContent = '⏳ 验证中...';
      const response = await fetch('/api/verify-server', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({host,port,connection_type: isTunnel?'cloudflare_tunnel':'standard'}) });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      resultsDiv.innerHTML = '';
      while(true) {
        const {done,value} = await reader.read();
        if(done) break;
        const lines = decoder.decode(value).split('\\n').filter(l=>l.startsWith('data: '));
        for(const line of lines) {
          const data = JSON.parse(line.slice(6));
          const stepEl = document.createElement('div'); stepEl.className = 'verify-step';
          if(data.step==='dns') {
            stepEl.textContent = (data.status==='running'?'⏳':data.status==='success'?'✅':'❌')+' DNS解析 '+(data.ip||data.error||'');
          } else if(data.step==='direct_ssh') {
            var label = data.step_label||'直连SSH';
            stepEl.textContent = (data.status==='running'?'⏳':data.status==='success'?'✅':'❌')+' '+label+' '+(data.status==='success'&&data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
          } else if(data.step==='proxy_ssh') {
            if(data.status==='skipped') {
              stepEl.style.color = 'var(--text-2)';
              stepEl.textContent = '⏭️ '+data.skip_reason;
            } else {
              stepEl.textContent = (data.status==='running'?'⏳':data.status==='success'?'✅':'❌')+' '+data.proxy_name+' '+(data.status==='success'&&data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
            }
          } else if(data.step==='verdict') {
            if (data.status === 'reachable') {
              stepEl.style.cssText = 'font-weight:bold;font-size:14px;padding:8px 12px;margin-top:6px;border-radius:6px;background:var(--green-bg,rgba(34,197,94,0.12));color:var(--green,#22c55e);border:1px solid var(--green,#22c55e)';
              var via = data.via === 'proxy' ? ('通过代理 '+data.name) : '直连';
              stepEl.textContent = '✅ 服务器可达 · ' + via + ' (' + data.latency_ms + 'ms)';
            } else {
              stepEl.style.cssText = 'font-weight:bold;font-size:14px;padding:8px 12px;margin-top:6px;border-radius:6px;background:var(--red-bg,rgba(239,68,68,0.12));color:var(--red,#ef4444);border:1px solid var(--red,#ef4444)';
              stepEl.textContent = '❌ 服务器不可达 — 所有连接方式(直连+代理)均失败';
            }
          }
          resultsDiv.appendChild(stepEl);
        }
      }
      var keyContentEl = document.getElementById('add-key-content');
      var passwordEl = document.getElementById('add-password');
      var vendorUrlEl = document.getElementById('add-vendor-url');
      var authMethod = document.getElementById('add-auth-method').value;
      const serverData = {
        name: document.getElementById('add-name').value, host: host, port: port,
        username: document.getElementById('add-user').value, auth_method: authMethod,
        key_content: (authMethod === 'key' && keyContentEl) ? keyContentEl.value : null,
        password: (authMethod === 'password' && passwordEl) ? passwordEl.value : null,
        gpu_model: document.getElementById('add-gpu').value||null, gpu_memory_gb: document.getElementById('add-gpu-mem').value?parseInt(document.getElementById('add-gpu-mem').value):null,
        cpu_cores: document.getElementById('add-cpu').value?parseInt(document.getElementById('add-cpu').value):null, ram_gb: document.getElementById('add-ram').value?parseInt(document.getElementById('add-ram').value):null,
        v2ray_available: document.getElementById('add-v2ray').checked, direct_when_proxy_available: document.getElementById('add-direct-proxy').checked, direct_when_no_proxy: document.getElementById('add-direct-no-proxy').checked,
        connection_type: document.getElementById('add-connection-type') ? document.getElementById('add-connection-type').value : 'standard',
        vendor_url: vendorUrlEl ? (vendorUrlEl.value||null) : null,
        notes: document.getElementById('add-notes') ? document.getElementById('add-notes').value||null : null,
      };
      if (!serverData.name||!serverData.host||!serverData.username) { resultsDiv.innerHTML += '<p style="color:var(--red)">请填写必填字段</p>'; return; }
      try {
        const result = await API.createServer(serverData);
        resultsDiv.innerHTML += '<p style="color:var(--green)">✅ 已保存</p>';
        setTimeout(()=>{closeModal();loadServers();},1000);
      } catch(e) { resultsDiv.innerHTML += '<p style="color:var(--red)">❌ 保存失败: '+e+'</p>'; }
    }

    var pendingProxyImages = [];

    function showAddProxy() {
      pendingProxyImages = [];
      showModal(
        '<h2>🌐 添加代理节点</h2>' +
        '<div class="ai-section">' +
        '  <div class="title">🤖 AI 智能导入 — 粘贴代理配置文本或截图</div>' +
        '  <textarea id="proxy-ai-text" placeholder="在此粘贴代理节点配置（订阅链接、节点信息、VPN配置等），也可以按 Ctrl+V 粘贴截图..."></textarea>' +
        '  <div class="img-grid" id="proxy-img-grid"></div>' +
        '  <div id="proxy-ai-status" style="margin-top:8px"></div>' +
        '  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
        '    <button class="btn-primary" onclick="pickProxyImage()">📷 选择截图</button>' +
        '    <button class="btn-primary" onclick="runProxyAiExtract()">🤖 AI 提取</button>' +
        '  </div>' +
        '  <input type="file" accept="image/*" multiple style="display:none" id="proxy-img-input" onchange="handleProxyImageFiles(this)">' +
        '</div>' +
        '<div class="form-group"><label>名称</label><input id="proxy-name" placeholder="HK-Node-1"></div>' +
        '<div class="form-row"><div class="form-group"><label>地址</label><input id="proxy-host" placeholder="127.0.0.1"></div><div class="form-group"><label>端口</label><input id="proxy-port" value="1080"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>协议</label><select id="proxy-protocol"><option value="socks5">SOCKS5</option><option value="http">HTTP</option></select></div><div class="form-group"><label>位置</label><input id="proxy-location" placeholder="香港"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>用户名</label><input id="proxy-user" placeholder="(可选)"></div><div class="form-group"><label>密码</label><input id="proxy-pass" type="password" placeholder="(可选)"></div></div>' +
        '<div class="modal-actions"><button class="btn-primary" onclick="saveProxy()">保存</button><button onclick="closeModal()">取消</button></div>'
      );

      // Wire up paste on textarea to capture images
      var ta = document.getElementById('proxy-ai-text');
      if (ta) {
        ta.onpaste = function(e) {
          var hasImage = false;
          for (var i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
              hasImage = true;
              addProxyImage(e.clipboardData.items[i].getAsFile());
            }
          }
          if (hasImage) e.preventDefault();
        };
      }
    }

    function pickServerImage() { var el = document.getElementById('img-input'); if(el) el.click(); }
    function pickProxyImage() { var el = document.getElementById('proxy-img-input'); if(el) el.click(); }

    function addProxyImage(blob) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        pendingProxyImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
        renderProxyImageThumbs();
      };
      reader.readAsDataURL(blob);
    }

    function renderProxyImageThumbs() {
      var grid = document.getElementById('proxy-img-grid');
      if (!grid) return;
      grid.innerHTML = '';
      for (var i = 0; i < pendingProxyImages.length; i++) {
        (function(idx) {
          var thumb = document.createElement('div'); thumb.className = 'thumb';
          var img = document.createElement('img');
          img.src = 'data:' + pendingProxyImages[idx].mime_type + ';base64,' + pendingProxyImages[idx].base64;
          var del = document.createElement('button'); del.className = 'del'; del.textContent = 'x';
          del.onclick = function() { pendingProxyImages.splice(idx, 1); renderProxyImageThumbs(); };
          thumb.appendChild(img); thumb.appendChild(del); grid.appendChild(thumb);
        })(i);
      }
    }

    function handleProxyImageFiles(input) {
      if (!input.files || input.files.length === 0) return;
      for (var i = 0; i < input.files.length; i++) {
        (function(blob) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            pendingProxyImages.push({ base64: ev.target.result.split(',')[1], mime_type: blob.type });
            renderProxyImageThumbs();
          };
          reader.readAsDataURL(blob);
        })(input.files[i]);
      }
      input.value = '';
    }

    function runProxyAiExtract() {
      var text = document.getElementById('proxy-ai-text') ? document.getElementById('proxy-ai-text').value.trim() : '';
      var statusDiv = document.getElementById('proxy-ai-status');
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 正在识别代理信息...</span></div>';

      if (!text && pendingProxyImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">请粘贴文本或上传图片后再提取</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingProxyImages.length > 0) body.images = pendingProxyImages;

      fetch('/api/ai/extract-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          var d = result.data;
          function setVal(id, val) {
            var el = document.getElementById(id);
            if (el) el.value = (val !== undefined && val !== null) ? String(val) : '';
          }
          setVal('proxy-name', d.name || d.host || '');
          setVal('proxy-host', d.host || '');
          setVal('proxy-port', d.port || 1080);
          setVal('proxy-location', d.location || '');
          setVal('proxy-user', d.username || '');
          setVal('proxy-pass', d.password || '');
          if (d.protocol) {
            var sel = document.getElementById('proxy-protocol');
            if (sel) sel.value = d.protocol;
          }
          statusDiv.innerHTML = '<p style="color:var(--green)">✅ AI 识别完成，已自动填充</p>';
        } else {
          statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + (result.error || '识别失败') + '</p>';
        }
      })
      .catch(function(err) {
        statusDiv.innerHTML = '<p style="color:var(--red)">❌ 网络错误: ' + err.message + '</p>';
      });
    }

    async function saveProxy() {
      var nameEl = document.getElementById('proxy-name');
      var hostEl = document.getElementById('proxy-host');
      var portEl = document.getElementById('proxy-port');
      var locationEl = document.getElementById('proxy-location');
      var protocolEl = document.getElementById('proxy-protocol');
      if (!nameEl || !hostEl || !nameEl.value || !hostEl.value) { showToast('请填写名称和地址', 'error'); return; }
      var userEl = document.getElementById('proxy-user');
      var passEl = document.getElementById('proxy-pass');
      var data = {
        name: nameEl.value,
        host: hostEl.value,
        port: parseInt(portEl ? portEl.value : '1080') || 1080,
        username: userEl ? (userEl.value||null) : null,
        password: passEl ? (passEl.value||null) : null,
        location: locationEl ? (locationEl.value||null) : null,
        protocol: protocolEl ? protocolEl.value : 'socks5'
      };
      await API.createProxy(data); closeModal(); loadProxies();
    }
    function showTaskTimerModal(id) {
      const s = servers.find(x => x.id === id); if (!s) return;
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = '⏱️ 任务倒计时与物理租期管理';
      modalContent.appendChild(h2);

      const desc = document.createElement('p');
      desc.style.cssText = 'color:var(--text-dim);font-size:13px;margin-bottom:16px;line-height:1.5;';
      desc.textContent = '管理服务器 [' + s.name + ' (' + s.host + ')] 的【任务执行倒计时】与【服务器物理存活寿命】。两项相互独立，共同驱动智能备份决策。';
      modalContent.appendChild(desc);

      // Status summary box
      const curDiv = document.createElement('div');
      curDiv.style.cssText = 'padding:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:16px;font-size:13px;line-height:1.6;';
      
      let sLeaseInfo = '🔋 物理租期：<b>永久 / 长期物理机</b>';
      let sRemMin = null;
      if (s.server_expires_at) {
        sRemMin = Math.round((new Date(s.server_expires_at).getTime() - Date.now()) / 60000);
        if (sRemMin <= 0) {
          sLeaseInfo = '🔋 物理租期：<span style="color:var(--red);font-weight:bold;">🛑 物理已过期 (' + (-sRemMin) + ' 分钟前)</span>';
        } else if (sRemMin <= 60) {
          sLeaseInfo = '🔋 物理租期：<span style="color:#f97316;font-weight:bold;">⚠️ 物理临期：剩余 ' + sRemMin + ' 分钟 (即将关机)</span>';
        } else {
          sLeaseInfo = '🔋 物理租期：<span style="color:var(--blue);font-weight:bold;">剩余 ' + (sRemMin >= 120 ? (sRemMin/60).toFixed(1) + ' 小时' : sRemMin + ' 分钟') + '</span>';
        }
      }

      const isBusy = s.current_agent && s.current_task;
      let tTaskInfo = isBusy ? ('📋 当前任务：由 <b>' + escHtml(s.current_agent) + '</b> 占用 (' + escHtml(s.current_task) + ')') : '🟢 当前任务状态：<b>空闲 (未占用)</b>';
      if (isBusy && s.task_expires_at) {
        const tRem = Math.round((new Date(s.task_expires_at).getTime() - Date.now()) / 60000);
        if (tRem <= 0) {
          tTaskInfo += '<br>⏱️ 任务倒计时：<span style="color:var(--red);font-weight:bold;">⚠️ 任务已超时 (' + (-tRem) + ' 分钟前到期)</span>';
        } else {
          tTaskInfo += '<br>⏱️ 任务倒计时：<span style="color:var(--green);font-weight:bold;">剩余 ' + tRem + ' 分钟 (共 ' + (s.task_duration_minutes||tRem) + '分)</span>';
        }
      }

      curDiv.innerHTML = sLeaseInfo + '<br>' + tTaskInfo;
      modalContent.appendChild(curDiv);

      function addFormGroup(label, inputHtml) {
        const g = document.createElement('div'); g.className = 'form-group';
        const l = document.createElement('label'); l.textContent = label; g.appendChild(l);
        const w = document.createElement('div'); w.innerHTML = inputHtml; g.appendChild(w.firstChild);
        modalContent.appendChild(g);
      }

      // Section 1: Server physical lease
      const sec1 = document.createElement('div');
      sec1.innerHTML = '<div style="margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid var(--border);font-weight:bold;color:var(--blue);">1. 🔋 服务器物理寿命/租期 (Server Physical Lease)</div>';
      modalContent.appendChild(sec1);

      const leaseGroup = document.createElement('div'); leaseGroup.className = 'form-group';
      leaseGroup.innerHTML = '<label>调整物理剩余租期 (云厂商按小时租用时到期时间)</label>' +
        '<select id="tt-server-lease">' +
        '<option value="keep">保持现有 (' + (s.server_expires_at ? '到期时间: ' + s.server_expires_at.slice(0, 16).replace('T', ' ') : '永久/未限时') + ')</option>' +
        '<option value="unlimited">设为永久 / 不限时物理机</option>' +
        '<option value="1h">设为 1 小时后物理关机</option>' +
        '<option value="2h">设为 2 小时后物理关机</option>' +
        '<option value="4h">设为 4 小时后物理关机</option>' +
        '<option value="8h">设为 8 小时后物理关机</option>' +
        '<option value="24h">设为 24 小时后物理关机</option>' +
        '<option value="custom">指定精确截止日期时间...</option>' +
        '</select>';
      modalContent.appendChild(leaseGroup);

      const customLeaseWrap = document.createElement('div');
      customLeaseWrap.id = 'tt-custom-lease-wrap';
      customLeaseWrap.style.display = 'none';
      customLeaseWrap.className = 'form-group';
      customLeaseWrap.innerHTML = '<label>指定物理截止时间 (本地时间)</label><input id="tt-custom-lease-dt" type="datetime-local" value="' + (s.server_expires_at ? s.server_expires_at.slice(0, 16) : '') + '">';
      modalContent.appendChild(customLeaseWrap);

      setTimeout(function() {
        const leaseSel = document.getElementById('tt-server-lease');
        if (leaseSel) {
          leaseSel.onchange = function() {
            customLeaseWrap.style.display = this.value === 'custom' ? 'block' : 'none';
          };
        }
      }, 50);

      // Section 2: Task countdown
      const sec2 = document.createElement('div');
      sec2.innerHTML = '<div style="margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid var(--border);font-weight:bold;color:var(--yellow);">2. ⏱️ 本轮实验任务与倒计时 (Task & Duration)</div>';
      modalContent.appendChild(sec2);

      addFormGroup('任务描述 (Task Name / Summary)', '<input id="tt-task" type="text" placeholder="例如: train-qwen-7b-lora, eval-benchmark" value="' + escHtml(s.current_task || '') + '">');
      addFormGroup('执行 Agent 标识', '<input id="tt-agent" type="text" placeholder="例如: web-user, claude-code, antigravity, codex" value="' + escHtml(s.current_agent || 'web-user') + '">');

      const durGroup = document.createElement('div');
      durGroup.className = 'form-group';
      durGroup.innerHTML = '<label>任务倒计时时长 (Task Countdown Duration)</label>' +
        '<select id="tt-duration">' +
        '<option value="0">不计时 / 不限时 (0 分钟)</option>' +
        '<option value="15">15 分钟 (快速实验)</option>' +
        '<option value="30">30 分钟 (短期调试)</option>' +
        '<option value="60">1 小时 (60 分钟)</option>' +
        '<option value="120">2 小时 (120 分钟)</option>' +
        '<option value="240">4 小时 (240 分钟)</option>' +
        '<option value="480">8 小时 (480 分钟 / 隔夜任务)</option>' +
        '<option value="custom">自定义任务分钟数...</option>' +
        '</select>';
      modalContent.appendChild(durGroup);

      const isCustomInitial = s.task_duration_minutes && ![15,30,60,120,240,480].includes(s.task_duration_minutes);
      const customWrap = document.createElement('div');
      customWrap.id = 'tt-custom-wrap';
      customWrap.style.display = isCustomInitial ? 'block' : 'none';
      customWrap.className = 'form-group';
      customWrap.innerHTML = '<label>自定义任务分钟数 (正整数)</label><input id="tt-custom-minutes" type="number" min="1" max="10080" placeholder="例如: 90" value="' + (s.task_duration_minutes || 60) + '">';
      modalContent.appendChild(customWrap);

      setTimeout(function() {
        const durSel = document.getElementById('tt-duration');
        if (durSel) {
          if (isCustomInitial) {
            durSel.value = 'custom';
          } else if (s.task_duration_minutes && [15,30,60,120,240,480].includes(s.task_duration_minutes)) {
            durSel.value = String(s.task_duration_minutes);
          }
          durSel.onchange = function() {
            customWrap.style.display = this.value === 'custom' ? 'block' : 'none';
          };
        }
      }, 50);

      // Smart hint box
      const hintBox = document.createElement('div');
      hintBox.style.cssText = 'padding:10px 12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:6px;font-size:12px;color:var(--text);margin-top:14px;line-height:1.5;';
      hintBox.innerHTML = '<b>💡 智能双模备份决策规则：</b><br>' +
        '• <b>物理剩余 > 1 小时 (充裕)</b>：任务结束仅备份单轮实验产出（权重/日志），坚决不备份庞大数据集，保留在机供后续任务享受 Dataset Affinity 亲和调度；<br>' +
        '• <b>物理剩余 &le; 1 小时 (临期关机)</b>：任务结束触发全量资产疏散备份（Google Drive &rarr; 对端服务器转移 &rarr; 本地核心私有权重）。';
      modalContent.appendChild(hintBox);

      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions'; actionsDiv.style.marginTop = '20px';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = '💾 保存设置';
      saveBtn.onclick = async function() {
        const taskVal = document.getElementById('tt-task').value.trim();
        const agentVal = document.getElementById('tt-agent').value.trim();
        
        const durSel = document.getElementById('tt-duration').value;
        let durationMinutes = 0;
        if (durSel === 'custom') {
          durationMinutes = parseInt(document.getElementById('tt-custom-minutes').value) || 0;
        } else {
          durationMinutes = parseInt(durSel) || 0;
        }

        // Physical lease computation
        const leaseSel = document.getElementById('tt-server-lease').value;
        let newServerExpiresAt = undefined;
        if (leaseSel === 'unlimited') {
          newServerExpiresAt = null;
        } else if (leaseSel === '1h') {
          newServerExpiresAt = new Date(Date.now() + 3600000).toISOString();
        } else if (leaseSel === '2h') {
          newServerExpiresAt = new Date(Date.now() + 7200000).toISOString();
        } else if (leaseSel === '4h') {
          newServerExpiresAt = new Date(Date.now() + 14400000).toISOString();
        } else if (leaseSel === '8h') {
          newServerExpiresAt = new Date(Date.now() + 28800000).toISOString();
        } else if (leaseSel === '24h') {
          newServerExpiresAt = new Date(Date.now() + 86400000).toISOString();
        } else if (leaseSel === 'custom') {
          const dtVal = document.getElementById('tt-custom-lease-dt').value;
          if (dtVal) {
            newServerExpiresAt = new Date(dtVal).toISOString();
          }
        }

        saveBtn.disabled = true; saveBtn.textContent = '保存中...';
        try {
          if (taskVal || agentVal || durationMinutes > 0) {
            await API.claimServer(s.id, agentVal || 'web-user', taskVal || 'manual-task', durationMinutes, newServerExpiresAt);
          } else if (newServerExpiresAt !== undefined) {
            await API.setServerLease(s.id, newServerExpiresAt);
          }
          showToast('✔ 成功保存物理租期与任务倒计时！', 'success');
          closeModal();
          loadServers();
        } catch (e) {
          showToast('网络错误: ' + e.message, 'error');
          saveBtn.disabled = false; saveBtn.textContent = '保存';
        }
      };
      actionsDiv.appendChild(saveBtn);

      if (isBusy) {
        const relBtn = document.createElement('button');
        relBtn.className = 'btn btn-danger';
        relBtn.textContent = '🛑 释放任务占用';
        relBtn.onclick = async function() {
          if (confirm('确定释放服务器 ' + s.name + ' 的当前任务占用？')) {
            await API.releaseServer(s.id);
            showToast('✔ 任务已释放为闲置状态', 'success');
            closeModal();
            loadServers();
          }
        };
        actionsDiv.appendChild(relBtn);
      }

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-secondary';
      closeBtn.textContent = '取消';
      closeBtn.onclick = closeModal;
      actionsDiv.appendChild(closeBtn);

      modalContent.appendChild(actionsDiv);
      showModalWithElement(modalContent);
    }

    function showServerDetail(id) {
      const s = servers.find(x=>x.id===id); if(!s) return;
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2'); h2.textContent = '🖥️ ' + s.name; modalContent.appendChild(h2);
      const addRow = (label, value) => {
        const row = document.createElement('div'); row.className = 'info-row';
        const lbl = document.createElement('span'); lbl.textContent = label;
        const val = document.createElement('span'); val.innerHTML = value;
        row.appendChild(lbl); row.appendChild(val); modalContent.appendChild(row);
      };
      addRow('地址', escHtml(s.host)+':'+s.port);
      addRow('状态', s.status_online?'<span style="color:var(--green)">🟢 在线</span>':'<span style="color:var(--red)">🔴 离线</span>');
      addRow('GPU 规格', s.gpu_model ? (s.gpu_count+'x '+s.gpu_model+' ('+s.gpu_memory_gb+'GB)') : '无独显/CPU');
      addRow('内存 / 磁盘', (s.ram_gb?s.ram_gb+'GB':'N/A') + ' / ' + (s.disk_gb?s.disk_gb+'GB':'N/A'));
      
      // Physical lease
      let sRemMin = null;
      if (s.server_expires_at) {
        sRemMin = Math.round((new Date(s.server_expires_at).getTime() - Date.now()) / 60000);
        if (sRemMin <= 0) {
          addRow('物理租期', '<span style="color:var(--red);font-weight:bold;">🛑 物理已过期 (' + (-sRemMin) + ' 分钟前)</span>');
        } else if (sRemMin <= 60) {
          addRow('物理租期', '<span style="color:#f97316;font-weight:bold;">⚠️ 物理临期: 剩余 ' + sRemMin + ' 分钟 (即将关机)</span>');
        } else {
          addRow('物理租期', '<span style="color:var(--blue);font-weight:bold;">🔋 剩余 ' + (sRemMin >= 120 ? (sRemMin/60).toFixed(1)+' 小时' : sRemMin+' 分钟') + ' (' + s.server_expires_at.slice(0,16).replace('T',' ') + ')</span>');
        }
      } else {
        addRow('物理租期', '<span style="color:var(--text-dim)">♾️ 永久 / 长期物理机</span>');
      }

      // Backup strategy prediction
      const stratHtml = (sRemMin !== null && sRemMin <= 60)
        ? '<span style="color:#f97316;font-weight:600;">⚠️ 全量资产疏散备份 (物理临期 &le; 1小时, 数据集将随之转移/备份)</span>'
        : '<span style="color:var(--green);font-weight:600;">💡 轻量实验产出备份 (物理寿命充裕 > 1小时, 坚决不备份庞大数据集, 维持本地亲和优势)</span>';
      addRow('备份决策模式', stratHtml);

      if (s.current_task && s.current_agent) {
        addRow('当前任务占用', '<b>' + escHtml(s.current_agent) + '</b> → ' + escHtml(s.current_task));
        if (s.task_expires_at) {
          const rem = Math.round((new Date(s.task_expires_at).getTime() - Date.now()) / 60000);
          if (rem <= 0) {
            addRow('任务倒计时', '<span style="color:var(--red);font-weight:bold;">⚠️ 任务已超时 (' + (-rem) + '分钟前到期)</span>');
          } else {
            addRow('任务倒计时', '<span style="color:var(--green);font-weight:bold;">⏱️ 剩余 ' + rem + ' 分钟 (共 ' + (s.task_duration_minutes||rem) + '分)</span>');
          }
        } else {
          addRow('任务倒计时', '<span style="color:var(--text-dim)">♾️ 不限时任务</span>');
        }
      } else {
        addRow('当前任务占用', '<span style="color:var(--green)">🟢 空闲 (可立即分配)</span>');
      }

      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
      const timerBtn = document.createElement('button');
      timerBtn.className = 'btn btn-primary';
      timerBtn.textContent = '⏱️ 设置任务/计时';
      timerBtn.onclick = function() { closeModal(); showTaskTimerModal(s.id); };
      actionsDiv.appendChild(timerBtn);

      const closeBtn = document.createElement('button'); closeBtn.textContent = '关闭';
      closeBtn.className = 'btn btn-secondary';
      closeBtn.onclick = closeModal; actionsDiv.appendChild(closeBtn);
      modalContent.appendChild(actionsDiv);
      showModalWithElement(modalContent);
    }
    function showEditServer(id) {
      // Fetch full server details first
      showModal('<div class="ai-loading"><div class="spinner"></div><span>加载服务器信息...</span></div>');
      API.serverById(id).then(function(s) {
        var content = document.createElement('div');
        var h2 = document.createElement('h2'); h2.textContent = '✏️ 编辑服务器'; content.appendChild(h2);

        function addField(label, html) {
          var group = document.createElement('div'); group.className = 'form-group';
          var lbl = document.createElement('label'); lbl.textContent = label;
          group.appendChild(lbl);
          // html is a string of innerHTML for the input element
          var wrapper = document.createElement('div'); wrapper.innerHTML = html;
          group.appendChild(wrapper.firstChild);
          content.appendChild(group);
        }
        function addInput(label, inputId, type, value) {
          addField(label, '<input id="'+inputId+'" type="'+type+'" value="'+escHtml(String(value!=null?value:''))+'">');
        }

        addInput('名称', 'edit-name', 'text', s.name);
        var _eCT = s.connection_type || 'standard';
        addInput(_eCT === 'cloudflare_tunnel' ? '隧道域名' : '地址', 'edit-host', 'text', s.host);
        if (_eCT !== 'cloudflare_tunnel') {
          addInput('端口', 'edit-port', 'text', s.port);
        }
        addInput('用户名', 'edit-user', 'text', s.username);

        // Auth method selector
        addField('认证方式', '<select id="edit-auth-method"><option value="key"'+(s.auth_method==='key'?' selected':'')+'>SSH密钥</option><option value="password"'+(s.auth_method==='password'?' selected':'')+'>密码</option></select>');

        // Auth fields: key content or password
        var authHtml = '';
        if (s.auth_method === 'key') {
          authHtml = '<div class="form-group"><label>SSH密钥内容</label><textarea id="edit-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px">'+escHtml(s.key_content||'')+'</textarea></div>';
        } else {
          authHtml = '<div class="form-group"><label>密码</label><input id="edit-password" type="password" value="'+escHtml(s.password||'')+'"></div>';
        }
        var authDiv = document.createElement('div'); authDiv.id = 'edit-auth-fields'; authDiv.innerHTML = authHtml;
        content.appendChild(authDiv);

        // Wire up auth method toggle
        setTimeout(function() {
          var sel = document.getElementById('edit-auth-method');
          if (sel) sel.onchange = function() {
            var c = document.getElementById('edit-auth-fields');
            if (this.value === 'key') {
              c.innerHTML = '<div class="form-group"><label>SSH密钥内容</label><textarea id="edit-key-content" rows="6" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px"></textarea></div>';
            } else {
              c.innerHTML = '<div class="form-group"><label>密码</label><input id="edit-password" type="password"></div>';
            }
          };
        }, 50);

        addInput('GPU型号', 'edit-gpu', 'text', s.capabilities?.gpu_model||s.gpu_model||'');
        addInput('显存(GB)', 'edit-gpu-mem', 'number', s.capabilities?.gpu_memory_gb||s.gpu_memory_gb||'');
        addInput('GPU卡数', 'edit-gpu-count', 'number', s.gpu_count||'');
        var _sm = s.gpu_sharing_mode || 'shared';
        addField('GPU分配模式', '<select id="edit-gpu-sharing-mode"><option value="shared"'+(_sm==='shared'?' selected':'')+'>共享(按显存,适合推理)</option><option value="exclusive"'+(_sm==='exclusive'?' selected':'')+'>独占(整卡,适合训练)</option></select>');
        addInput('CPU核数', 'edit-cpu', 'number', s.capabilities?.cpu_cores||s.cpu_cores||'');
        addInput('内存(GB)', 'edit-ram', 'number', s.capabilities?.ram_gb||s.ram_gb||'');
        addInput('磁盘(GB)', 'edit-disk', 'number', s.capabilities?.disk_gb||s.disk_gb||'');
        addInput('厂商URL', 'edit-vendor-url', 'text', s.vendor_url||'');
        
        // Physical lease expiration
        addInput('物理租期截止时间 (可选, 留空表示永久)', 'edit-server-expires-at', 'datetime-local', s.server_expires_at ? s.server_expires_at.slice(0, 16) : '');

        // Notes field
        var notesGroup = document.createElement('div'); notesGroup.className = 'form-group';
        var notesLabel = document.createElement('label'); notesLabel.textContent = '备注';
        notesGroup.appendChild(notesLabel);
        var notesTa = document.createElement('textarea'); notesTa.id = 'edit-notes';
        notesTa.style.cssText = 'width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:13px;resize:vertical;min-height:40px';
        notesTa.textContent = s.notes||'';
        notesGroup.appendChild(notesTa);
        content.appendChild(notesGroup);

        // Connection type selector + mode toggles
        var _ct = s.connection_type || 'standard';
        var connDiv = document.createElement('div');
        connDiv.innerHTML = '<div style="margin:12px 0"><strong>连接方式</strong></div>'+
          '<div class="form-group"><label>连接形式</label><select id="edit-connection-type" onchange="editToggleConnType()"><option value="standard"'+(_ct==='standard'?' selected':'')+'>标准SSH（直连/代理）</option><option value="cloudflare_tunnel"'+(_ct==='cloudflare_tunnel'?' selected':'')+'>Cloudflare隧道（cloudflared access ssh）</option></select></div>'+
          '<div id="edit-conn-standard-toggles" class="toggle-group"'+(_ct==='cloudflare_tunnel'?' style="display:none"':'')+'>'+
          '<label><input type="checkbox" id="edit-v2ray"'+(s.proxy?.v2ray_available||s.v2ray_available?' checked':'')+'> 有V2RayN</label>'+
          '<label><input type="checkbox" id="edit-direct-proxy"'+(s.proxy?.direct_when_proxy_available||s.direct_when_proxy_available?' checked':'')+'> V2RayN时可直连</label>'+
          '<label><input type="checkbox" id="edit-direct-no-proxy"'+(s.proxy?.direct_when_no_proxy||s.direct_when_no_proxy?' checked':'')+'> 无代理时直连</label>'+
          '</div>'+
          '<div id="edit-conn-tunnel-hint" class="form-group"'+(_ct!=='cloudflare_tunnel'?' style="display:none"':'')+' style="margin-top:6px;padding:8px 12px;border-radius:6px;border:1px dashed var(--border);font-size:12px;color:var(--text-2)">☁️ 客户机需先安装 cloudflared 并执行 <code>cloudflared login</code>，连接时用 <code>ssh -o ProxyCommand="cloudflared access ssh --hostname %h" user@隧道域名</code></div>';
        content.appendChild(connDiv);

        var actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
        var saveBtn = document.createElement('button'); saveBtn.className = 'btn-primary';
        saveBtn.textContent = '保存'; saveBtn.onclick = function() { saveEditServer(id); };
        actionsDiv.appendChild(saveBtn);
        var cancelBtn = document.createElement('button'); cancelBtn.textContent = '取消';
        cancelBtn.onclick = closeModal; actionsDiv.appendChild(cancelBtn);
        content.appendChild(actionsDiv);
        showModalWithElement(content);
      }).catch(function(err) {
        showModal('<h2>❌ 加载失败</h2><p style="color:var(--red)">'+err.message+'</p><div class="modal-actions"><button class="btn-primary" onclick="closeModal()">关闭</button></div>');
      });
    }
    async function saveEditServer(id) {
      var expiresAtVal = document.getElementById('edit-server-expires-at') ? document.getElementById('edit-server-expires-at').value : '';
      var updates = {
        name: document.getElementById('edit-name').value,
        host: document.getElementById('edit-host').value,
        port: document.getElementById('edit-port') ? (parseInt(document.getElementById('edit-port').value)||22) : 22,
        username: document.getElementById('edit-user').value,
        auth_method: document.getElementById('edit-auth-method').value,
        gpu_model: document.getElementById('edit-gpu').value||null,
        gpu_memory_gb: document.getElementById('edit-gpu-mem').value ? parseInt(document.getElementById('edit-gpu-mem').value) : null,
        gpu_count: document.getElementById('edit-gpu-count') && document.getElementById('edit-gpu-count').value ? parseInt(document.getElementById('edit-gpu-count').value) : null,
        gpu_sharing_mode: document.getElementById('edit-gpu-sharing-mode') ? document.getElementById('edit-gpu-sharing-mode').value : 'shared',
        cpu_cores: document.getElementById('edit-cpu').value ? parseInt(document.getElementById('edit-cpu').value) : null,
        ram_gb: document.getElementById('edit-ram').value ? parseInt(document.getElementById('edit-ram').value) : null,
        disk_gb: document.getElementById('edit-disk').value ? parseInt(document.getElementById('edit-disk').value) : null,
        vendor_url: document.getElementById('edit-vendor-url').value||null,
        server_expires_at: expiresAtVal ? new Date(expiresAtVal).toISOString() : null,
        notes: document.getElementById('edit-notes') ? document.getElementById('edit-notes').value||null : null,
        connection_type: document.getElementById('edit-connection-type') ? document.getElementById('edit-connection-type').value : 'standard',
        v2ray_available: document.getElementById('edit-v2ray').checked ? 1 : 0,
        direct_when_proxy_available: document.getElementById('edit-direct-proxy').checked ? 1 : 0,
        direct_when_no_proxy: document.getElementById('edit-direct-no-proxy').checked ? 1 : 0,
      };
      // Read key or password based on auth method
      var keyContentEl = document.getElementById('edit-key-content');
      var passwordEl = document.getElementById('edit-password');
      if (keyContentEl) updates.key_content = keyContentEl.value;
      if (passwordEl) updates.password = passwordEl.value;
      await API.updateServer(id, updates);
      closeModal(); loadServers();
    }
    switchPage('servers');
    setInterval(()=>{if(currentPage==='servers')loadServers();},30000);
  </script>
</body>
</html>`;
