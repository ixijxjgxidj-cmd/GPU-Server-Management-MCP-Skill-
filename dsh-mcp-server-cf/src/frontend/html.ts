export const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DSH 服务器管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0f172a; --card-bg: #1e293b; --text: #e2e8f0;
      --text-dim: #94a3b8; --accent: #3b82f6; --green: #22c55e;
      --yellow: #eab308; --red: #ef4444; --border: #334155;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: var(--bg); color: var(--text); min-height: 100vh; }
    .nav { display: flex; gap: 0; background: var(--card-bg); border-bottom: 1px solid var(--border); }
    .nav button { padding: 12px 24px; background: none; color: var(--text-dim); border: none;
                  border-bottom: 2px solid transparent; cursor: pointer; font-size: 14px; }
    .nav button.active { color: var(--accent); border-bottom-color: var(--accent); }
    .header { display: flex; justify-content: space-between; align-items: center;
              padding: 16px 24px; gap: 12px; flex-wrap: wrap; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .status-bar { display: flex; gap: 12px; align-items: center; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 16px; padding: 0 24px 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
            padding: 16px; position: relative; transition: border-color 0.2s; }
    .card:hover { border-color: var(--accent); }
    .card .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .card .title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex;
                   align-items: center; justify-content: space-between; }
    .card .info-row { display: flex; justify-content: space-between; padding: 4px 0;
                      font-size: 13px; color: var(--text-dim); }
    .card .util-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;
                      flex: 1; margin: 0 8px; }
    .card .util-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .card .actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px;
                     border-top: 1px solid var(--border); }
    .card .actions button { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border);
                           background: none; color: var(--text); cursor: pointer; font-size: 12px; }
    .card .actions button:hover { background: var(--accent); border-color: var(--accent); }
    .card .actions button.danger:hover { background: var(--red); border-color: var(--red); }
    .btn-primary { padding: 8px 16px; border-radius: 8px; border: none;
                   background: var(--accent); color: white; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { opacity: 0.9; }
    .search-input { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);
                    background: var(--card-bg); color: var(--text); font-size: 14px; width: 200px; }
    .ai-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 32px; }
    .ai-loading .spinner { width: 24px; height: 24px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ai-section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .ai-section .title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--accent); }
    .ai-section textarea { width: 100%; min-height: 80px; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); font-size: 13px; font-family: inherit; resize: vertical; }
    .ai-section textarea:focus { border-color: var(--accent); outline: none; }
    .img-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    .img-grid .thumb { width: 80px; height: 60px; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid var(--border); }
    .img-grid .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .img-grid .thumb .del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,0.9); color: #fff; border: none; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .img-zone { border: 2px dashed var(--border); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s; margin-top: 8px; }
    .img-zone:hover { border-color: var(--accent); background: rgba(59,130,246,0.05); }
    .img-zone .hint { font-size: 12px; color: var(--text-dim); }
    .extracted-info { padding: 12px 0; }
    .extracted-info .field { display: flex; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .extracted-info .field:last-child { border-bottom: none; }
    .extracted-info .field-label { min-width: 100px; color: var(--text-dim); font-size: 13px; }
    .extracted-info .field-value { flex: 1; font-size: 13px; word-break: break-all; }
    .extracted-info .field-value.key { font-family: monospace; font-size: 11px; max-height: 80px; overflow-y: auto; white-space: pre; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                     display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
             padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .modal h2 { margin-bottom: 16px; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; font-size: 13px; color: var(--text-dim); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .toggle-group { display: flex; gap: 16px; }
    .toggle-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .verify-step { display: flex; align-items: center; gap: 8px; padding: 8px 0;
                   border-bottom: 1px solid var(--border); font-size: 14px; }
    .proxy-card { padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
    .proxy-card .proxy-name { font-weight: 600; }
    .proxy-card .proxy-info { font-size: 13px; color: var(--text-dim); }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px;
           background: var(--accent); font-size: 11px; margin: 2px; }
    .modal-title-bar { display: flex; justify-content: space-between; align-items: center; }
    .close-x { width: 28px; height: 28px; border-radius: 6px; border: none; background: transparent; color: var(--text-dim); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .close-x:hover { background: rgba(239,68,68,0.15); color: var(--red); }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; padding: 0 12px 12px; }
      .header { flex-direction: column; align-items: stretch; }
      .form-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <button onclick="switchPage('servers')" id="nav-servers" class="active">🖥️ 服务器</button>
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
    <div id="sharingBar" style="margin:0 24px 12px;padding:12px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card);display:flex;align-items:center;gap:16px;flex-wrap:wrap">
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
    let proxies = [];
    let logs = [];
    let currentPage = 'servers';

    const API = {
      servers: () => fetch('/api/servers').then(r => r.json()),
      serverById: (id) => fetch('/api/servers/'+id).then(r => r.json()),
      createServer: (data) => fetch('/api/servers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      updateServer: (id, data) => fetch('/api/servers/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteServer: (id) => fetch('/api/servers/'+id, { method:'DELETE' }).then(r => r.json()),
      enableServer: (id) => fetch('/api/servers/'+id+'/enable', { method:'POST' }).then(r => r.json()),
      disableServer: (id) => fetch('/api/servers/'+id+'/disable', { method:'POST' }).then(r => r.json()),
      proxies: () => fetch('/api/proxies').then(r => r.json()),
      createProxy: (data) => fetch('/api/proxies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deleteProxy: (id) => fetch('/api/proxies/'+id, { method:'DELETE' }).then(r => r.json()),
      logs: () => fetch('/api/usage').then(r => r.json()),
      recordUsage: (data) => fetch('/api/usage', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      claimServer: (id, agent, task) => fetch('/api/servers/'+id+'/claim', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({agent, task}) }).then(r => r.json()),
      releaseServer: (id) => fetch('/api/servers/'+id+'/release', { method:'POST' }).then(r => r.json()),
    };

    function switchPage(page) {
      currentPage = page;
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      document.getElementById('page-'+page).style.display = 'block';
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('nav-'+page).classList.add('active');
      if (page === 'servers') loadServers();
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
      if (s.os_hint) addInfoRow('系统', s.os_hint);
      if (s.ssh_banner) {
        var ver = s.ssh_banner.match(/SSH-[\d.]+-([^\s]+)/);
        if (ver) addInfoRow('SSH', ver[1]);
      }

      // Task / occupancy display
      const isBusy = s.current_agent && s.current_task;
      if (isBusy) {
        const taskRow = document.createElement('div'); taskRow.className = 'info-row';
        taskRow.style.cssText = 'border-top:1px solid var(--border);padding-top:8px;margin-top:4px;color:var(--yellow)';
        const taskLabel = document.createElement('span'); taskLabel.textContent = '📋 任务';
        const taskValue = document.createElement('span');
        taskValue.textContent = s.current_agent+' → '+s.current_task;
        if (s.task_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(s.task_started_at).getTime())/60000);
          taskValue.textContent += ' ('+elapsed+'分钟前)';
        }
        taskRow.appendChild(taskLabel); taskRow.appendChild(taskValue);
        card.appendChild(taskRow);
      }

      // Actions row
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions';
      const addActionBtn = (label, clickFn, extraClass) => {
        const btn = document.createElement('button'); btn.textContent = label;
        if (extraClass) btn.className = extraClass;
        btn.onclick = clickFn; actionsDiv.appendChild(btn);
      };
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
        '    <button class="btn-primary" onclick="document.getElementById(\\'img-input\\').click()">📷 选择截图</button>' +
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
      if (isTunnel) {
        // CF tunnel can't be TCP-pinged from the Worker; just validate the field.
        resultsDiv.innerHTML = '<div class="verify-step" style="color:var(--text-2)">☁️ Cloudflare隧道无法直连探测，保存后由跳板机经 cloudflared 探测</div>';
      } else {
        resultsDiv.textContent = '⏳ 验证中...';
        const response = await fetch('/api/verify-server', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({host,port}) });
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
            if(data.step==='direct_ssh') {
              stepEl.textContent = (data.status==='running'?'⏳':data.status==='success'?'✅':'❌')+' 直连SSH '+(data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
            } else if(data.step==='proxy_ssh') {
              stepEl.textContent = (data.status==='running'?'⏳':data.status==='success'?'✅':'❌')+' '+data.proxy_name+' '+(data.latency_ms?data.latency_ms+'ms':'')+' '+(data.error||'');
            } else if(data.step==='complete' && data.best_proxy) {
              stepEl.style.color = 'var(--green)';
              stepEl.textContent = '✅ 推荐: '+data.best_proxy.name+' ('+data.best_proxy.latency_ms+'ms)';
            }
            resultsDiv.appendChild(stepEl);
          }
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
    async function deleteServerConfirm(id) { if(confirm('确定删除？')){await API.deleteServer(id);loadServers();} }
    async function deleteProxyConfirm(id) { if(confirm('确定删除？')){await API.deleteProxy(id);loadProxies();} }
    function showServerDetail(id) {
      const s = servers.find(x=>x.id===id); if(!s) return;
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2'); h2.textContent = s.name; modalContent.appendChild(h2);
      const addRow = (label, value) => {
        const row = document.createElement('div'); row.className = 'info-row';
        const lbl = document.createElement('span'); lbl.textContent = label;
        const val = document.createElement('span'); val.textContent = value;
        row.appendChild(lbl); row.appendChild(val); modalContent.appendChild(row);
      };
      addRow('地址', s.host+':'+s.port);
      addRow('状态', s.status_online?'🟢在线':'🔴离线');
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
      const closeBtn = document.createElement('button'); closeBtn.textContent = '关闭';
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
