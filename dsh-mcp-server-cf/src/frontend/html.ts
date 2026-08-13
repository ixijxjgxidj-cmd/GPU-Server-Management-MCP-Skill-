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
      const online = filtered.filter(s => s.status_online && wasRecentlyUsed(s));
      const idle = filtered.filter(s => s.status_online && !wasRecentlyUsed(s));
      const offline = filtered.filter(s => !s.status_online);
      const statusBar = document.getElementById('statusBar');
      statusBar.innerHTML = '';
      [{label:'🟢 '+online.length},{label:'🟡 '+idle.length},{label:'🔴 '+offline.length}].forEach(c => {
        const badge = document.createElement('span'); badge.className = 'status-badge'; badge.textContent = c.label; statusBar.appendChild(badge);
      });
      const grid = document.getElementById('serverGrid');
      grid.innerHTML = '';
      [...online, ...idle, ...offline].forEach(s => grid.appendChild(createServerCard(s)));
    }

    function wasRecentlyUsed(server) {
      return new Date(server.updated_at).getTime() > Date.now() - 5*60*1000;
    }

    function createServerCard(s) {
      const card = document.createElement('div'); card.className = 'card';
      const isOnline = s.status_online;
      const dotColor = isOnline ? (wasRecentlyUsed(s) ? 'var(--green)' : 'var(--yellow)') : 'var(--red)';

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
      addInfoRow('GPU', s.gpu_model||'N/A');
      addInfoRow('CPU', s.cpu_cores?s.cpu_cores+'核':'N/A');
      addInfoRow('内存', s.ram_gb?s.ram_gb+'GB':'N/A');
      addInfoRow('Ping', s.status_ping_ms?s.status_ping_ms+'ms':'未探测');

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
      try {
        const resp = await fetch('/api/servers/probe/'+id, { method:'POST' });
        const result = await resp.json();
        if (result.success) loadServers();
      } catch(e) { console.error('Probe failed', e); }
    }

    function showModal(html) {
      // Only use innerHTML when html is a known-safe template string (form structures, not user data)
      document.getElementById('modalContainer').innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal">'+html+'</div></div>';
    }
    function showModalWithElement(contentEl) {
      const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
      overlay.onclick = function(e) { if (e.target===this) closeModal(); };
      const modal = document.createElement('div'); modal.className = 'modal';
      modal.appendChild(contentEl);
      overlay.appendChild(modal);
      const container = document.getElementById('modalContainer'); container.innerHTML = '';
      container.appendChild(overlay);
    }
    function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

    function showAddServer() {
      showModal('<h2>添加服务器</h2>'+
        '<div class="form-group"><label>名称</label><input id="add-name" placeholder="my-gpu-server"></div>'+
        '<div class="form-row"><div class="form-group"><label>地址</label><input id="add-host" placeholder="192.168.1.100"></div><div class="form-group"><label>SSH端口</label><input id="add-port" value="22"></div></div>'+
        '<div class="form-row"><div class="form-group"><label>用户名</label><input id="add-user" value="root"></div><div class="form-group"><label>认证</label><select id="add-auth-method"><option value="key">SSH密钥</option><option value="password">密码</option></select></div></div>'+
        '<div id="auth-fields"><div class="form-group"><label>密钥路径</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div></div>'+
        '<div class="form-row"><div class="form-group"><label>GPU型号</label><input id="add-gpu" placeholder="NVIDIA A100"></div><div class="form-group"><label>显存GB</label><input id="add-gpu-mem" type="number"></div></div>'+
        '<div class="form-row"><div class="form-group"><label>CPU核数</label><input id="add-cpu" type="number"></div><div class="form-group"><label>内存GB</label><input id="add-ram" type="number"></div></div>'+
        '<div style="margin:12px 0"><strong>连接方式</strong></div>'+
        '<div class="toggle-group"><label><input type="checkbox" id="add-v2ray"> 有V2RayN</label><label><input type="checkbox" id="add-direct-proxy" checked> V2RayN时可直连</label><label><input type="checkbox" id="add-direct-no-proxy"> 无代理时直连</label></div>'+
        '<div id="verify-results" style="margin-top:12px"></div>'+
        '<div class="modal-actions"><button class="btn-primary" onclick="verifyAndSave()">验证并保存</button><button onclick="closeModal()">取消</button></div>');
      document.getElementById('add-auth-method').onchange = function() {
        document.getElementById('auth-fields').innerHTML = this.value==='key'?'<div class="form-group"><label>密钥路径</label><input id="add-key-path" placeholder="/home/.ssh/id_rsa"></div>':'<div class="form-group"><label>密码</label><input id="add-password" type="password"></div>';
      };
    }

    async function verifyAndSave() {
      const host = document.getElementById('add-host').value;
      const port = parseInt(document.getElementById('add-port').value) || 22;
      const resultsDiv = document.getElementById('verify-results');
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
      const serverData = {
        name: document.getElementById('add-name').value, host: host, port: port,
        username: document.getElementById('add-user').value, auth_method: document.getElementById('add-auth-method').value,
        gpu_model: document.getElementById('add-gpu').value||null, gpu_memory_gb: document.getElementById('add-gpu-mem').value?parseInt(document.getElementById('add-gpu-mem').value):null,
        cpu_cores: document.getElementById('add-cpu').value?parseInt(document.getElementById('add-cpu').value):null, ram_gb: document.getElementById('add-ram').value?parseInt(document.getElementById('add-ram').value):null,
        v2ray_available: document.getElementById('add-v2ray').checked, direct_when_proxy_available: document.getElementById('add-direct-proxy').checked, direct_when_no_proxy: document.getElementById('add-direct-no-proxy').checked,
      };
      if (!serverData.name||!serverData.host||!serverData.username) { resultsDiv.innerHTML += '<p style="color:var(--red)">请填写必填字段</p>'; return; }
      try {
        const result = await API.createServer(serverData);
        resultsDiv.innerHTML += '<p style="color:var(--green)">✅ 已保存</p>';
        setTimeout(()=>{closeModal();loadServers();},1000);
      } catch(e) { resultsDiv.innerHTML += '<p style="color:var(--red)">❌ 保存失败: '+e+'</p>'; }
    }

    function showAddProxy() {
      showModal('<h2>添加代理节点</h2><div class="form-group"><label>名称</label><input id="proxy-name" placeholder="HK-Node-1"></div>'+
        '<div class="form-row"><div class="form-group"><label>地址</label><input id="proxy-host" placeholder="127.0.0.1"></div><div class="form-group"><label>端口</label><input id="proxy-port" value="1080"></div></div>'+
        '<div class="form-group"><label>位置</label><input id="proxy-location" placeholder="香港"></div>'+
        '<div class="modal-actions"><button class="btn-primary" onclick="saveProxy()">保存</button><button onclick="closeModal()">取消</button></div>');
    }
    async function saveProxy() {
      const data = { name: document.getElementById('proxy-name').value, host: document.getElementById('proxy-host').value, port: parseInt(document.getElementById('proxy-port').value)||1080, location: document.getElementById('proxy-location').value||null };
      if (!data.name||!data.host) { alert('请填写名称和地址'); return; }
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
      const s = servers.find(x=>x.id===id); if(!s) return;
      const content = document.createElement('div');
      const h2 = document.createElement('h2'); h2.textContent = '编辑服务器'; content.appendChild(h2);
      const addField = (label, inputId, inputType, value) => {
        const group = document.createElement('div'); group.className = 'form-group';
        const lbl = document.createElement('label'); lbl.textContent = label;
        const input = document.createElement('input'); input.id = inputId; input.type = inputType; input.value = value;
        group.appendChild(lbl); group.appendChild(input); content.appendChild(group);
      };
      addField('名称', 'edit-name', 'text', s.name);
      addField('地址', 'edit-host', 'text', s.host);
      addField('端口', 'edit-port', 'text', String(s.port));
      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
      const saveBtn = document.createElement('button'); saveBtn.className = 'btn-primary';
      saveBtn.textContent = '保存'; saveBtn.onclick = () => saveEditServer(id);
      actionsDiv.appendChild(saveBtn);
      const cancelBtn = document.createElement('button'); cancelBtn.textContent = '取消';
      cancelBtn.onclick = closeModal; actionsDiv.appendChild(cancelBtn);
      content.appendChild(actionsDiv);
      showModalWithElement(content);
    }
    async function saveEditServer(id) {
      await API.updateServer(id, { name: document.getElementById('edit-name').value, host: document.getElementById('edit-host').value, port: parseInt(document.getElementById('edit-port').value)||22 });
      closeModal(); loadServers();
    }
    switchPage('servers');
    setInterval(()=>{if(currentPage==='servers')loadServers();},30000);
  </script>
</body>
</html>`;
