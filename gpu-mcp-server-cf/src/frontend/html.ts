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
      font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex;
      align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .card .title > span:first-child {
      flex: 1; min-width: 0; word-break: break-all; overflow-wrap: anywhere; line-height: 1.4;
    }
    .card .title > span:last-child {
      flex-shrink: 0; white-space: nowrap;
    }
    .card .info-row { 
      display: flex; align-items: baseline; justify-content: space-between; padding: 8px 0; gap: 12px;
      font-size: 13px; color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .card .info-row:last-of-type { border-bottom: none; }
    .card .info-row span:first-child { 
      flex-shrink: 0; white-space: nowrap; min-width: 85px; color: #888; font-size: 13px; text-align: left; 
    }
    .card .info-row span:last-child { 
      flex: 1; min-width: 0; color: var(--text); font-weight: 400; text-align: right; 
      overflow-wrap: anywhere; word-break: break-all; line-height: 1.5; 
    }
    
    .card .util-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; flex: 1; margin: 0 12px; }
    .card .util-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }

    .card .actions { 
      display: flex; gap: 8px; margin-top: 20px; padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap;
    }
    .card .actions button { 
      padding: 6px 14px; border-radius: 8px; white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); 
      color: var(--text); cursor: pointer; font-size: 12px; font-weight: 500;
      transition: all 0.2s;
    }
    .card .actions button:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
    .card .actions button.danger:hover { background: rgba(239,68,68,0.15); border-color: var(--red); color: var(--red); }

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
    #knowledgeCategoryFilters .btn { box-shadow: none !important; border: 1px solid transparent; border-radius: 20px; font-weight: 500; font-size: 13px; padding: 6px 16px; transition: all 0.2s; }
    #knowledgeCategoryFilters .btn-primary { background: #fff !important; color: #000 !important; }
    #knowledgeCategoryFilters .btn-secondary { background: transparent !important; color: #888 !important; }
    #knowledgeCategoryFilters .btn-secondary:hover { color: #fff !important; background: rgba(255,255,255,0.06) !important; }
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
    <button onclick="switchPage('knowledge')" id="nav-knowledge">🧠 知识库 (RAG)</button>
    <button onclick="switchPage('datasets')" id="nav-datasets">📦 数据集与预存</button>
    <button onclick="switchPage('gdrive')" id="nav-gdrive">📁 云盘存储 (Drive)</button>
    <button onclick="switchPage('proxies')" id="nav-proxies">🌐 代理池</button>
    <button onclick="switchPage('logs')" id="nav-logs">📋 使用记录</button>
    <button onclick="openNimConfigModal()" id="nav-nim-btn" style="margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:8px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-weight:600;font-size:13px;cursor:pointer;transition:all 0.2s ease;">
      <span>🔑 NVIDIA NIM 设置</span>
      <span id="nim-nav-badge" style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.25);color:#6ee7b7">检测中...</span>
    </button>
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
  <div id="page-knowledge" class="page" style="display:none">
    <div class="header" style="flex-direction:column;align-items:flex-start;gap:24px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <h1 style="margin:0;font-size:28px;font-weight:600;letter-spacing:-0.5px;color:#fff;">知识中枢</h1>
        </div>
        <button class="btn btn-secondary" onclick="loadKnowledge()" style="font-size:13px;padding:8px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:var(--text);font-weight:500;transition:all 0.2s;box-shadow:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">刷新</button>
      </div>
      <div style="font-size:15px;color:#888;line-height:1.6;max-width:700px;font-weight:400;">
        聚合全集群的经验、配置备忘与实验备份。遇到环境依赖或报错问题，输入日志或关键词即可进行语义检索。
      </div>
      <div style="display:flex;gap:16px;width:100%;flex-wrap:wrap;margin-top:4px;">
        <input class="search-input" id="knowledgeSearchInput" style="flex:1;min-width:280px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.04);padding:14px 20px;font-size:15px;border-radius:14px;color:#fff;transition:all 0.2s;outline:none;box-shadow:none;" placeholder="搜索报错日志或组件..." oninput="onKnowledgeSearchInput()" onfocus="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,255,255,0.1)';this.style.boxShadow='none';" onblur="this.style.background='rgba(255,255,255,0.04)';this.style.borderColor='rgba(255,255,255,0.04)';">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px;" id="knowledgeCategoryFilters">
        <button class="btn btn-primary" id="kCat-all" onclick="setKnowledgeCategory('all')">全部</button>
        <button class="btn btn-secondary" id="kCat-pitfall" onclick="setKnowledgeCategory('pitfall')">避坑经验</button>
        <button class="btn btn-secondary" id="kCat-note" onclick="setKnowledgeCategory('note')">节点备注</button>
        <button class="btn btn-secondary" id="kCat-backup" onclick="setKnowledgeCategory('backup')">实验备份</button>
      </div>
    </div>
    <div style="padding:0 24px 48px;">
      <div id="knowledgeResultsGrid" style="display:flex;flex-direction:column;gap:32px;max-width:900px;"></div>
    </div>
  </div>
  <div id="page-datasets" class="page" style="display:none">
    <div class="header" style="flex-direction:column;align-items:flex-start;gap:20px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="margin:0;font-size:28px;font-weight:600;letter-spacing:-0.5px;color:#fff;">数据集与备份</h1>
          <p style="font-size:14px;color:#888;margin-top:6px;max-width:750px;line-height:1.5">
            各算力节点的预存数据集 (Dataset Affinity) 及 RAG 向量备份索引。备份索引与源机生命周期绑定。
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-secondary" onclick="showRegisterDatasetModal()" style="font-size:13px;padding:8px 16px;background:#fff;color:#000;border:none;border-radius:20px;font-weight:500;">登记数据集</button>
          <button class="btn btn-secondary" onclick="refreshDatasetsPage()" style="font-size:13px;padding:8px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:var(--text);font-weight:500;">刷新</button>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin:24px 24px 20px;">
      <div style="padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;">
        <div style="font-size:12px;color:#888;font-weight:500;">预存数据集总数</div>
        <div id="datasetCountStat" style="font-size:22px;font-weight:600;color:#fff;margin-top:6px">0 个</div>
      </div>
      <div style="padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;">
        <div style="font-size:12px;color:#888;font-weight:500;">预估总存储占用</div>
        <div id="datasetSizeStat" style="font-size:22px;font-weight:600;color:#fff;margin-top:6px">0 GB</div>
      </div>
      <div style="padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;">
        <div style="font-size:12px;color:#888;font-weight:500;">覆盖算力节点</div>
        <div id="datasetServerStat" style="font-size:22px;font-weight:600;color:#fff;margin-top:6px">0 台</div>
      </div>
      <div style="padding:18px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;">
        <div style="font-size:12px;color:#888;font-weight:500;">RAG 备份索引记录</div>
        <div id="backupCountStat" style="font-size:22px;font-weight:600;color:#fff;margin-top:6px">0 条</div>
      </div>
    </div>

    <!-- Section 1: Pre-cached Datasets -->
    <div style="margin:24px 24px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:12px">
      <div>
        <h2 style="font-size:17px;font-weight:600;color:#fff;margin:0;">节点预存数据集</h2>
      </div>
      <input class="search-input" id="datasetSearchInput" placeholder="过滤数据集/路径/服务器..." oninput="renderDatasets()" style="min-width:240px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;font-size:13px;">
    </div>
    <div class="grid" id="datasetGrid"></div>

    <!-- Section 2: Backup Indexes & RAG Vector Search -->
    <div style="margin:40px 24px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:12px">
      <div>
        <h2 style="font-size:17px;font-weight:600;color:#fff;margin:0;">云端备份索引库</h2>
        <p style="font-size:13px;color:#888;margin-top:4px;line-height:1.4">支持输入自然语言或指标关键词进行 RAG 混合检索。</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input class="search-input" id="ragSearchInput" placeholder="搜索备份与模型指标 (如 loss 0.18)..." oninput="onRagSearchInput()" style="min-width:260px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 14px;font-size:13px;">
        <select id="backupTypeFilter" onchange="loadBackups()" style="padding:8px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);color:var(--text);border-radius:10px;font-size:13px;outline:none;">
          <option value="">全部类型</option>
          <option value="google_drive">Google Drive</option>
          <option value="peer_server">对端中转</option>
          <option value="local_weights">本地权重</option>
        </select>
      </div>
    </div>
    <div class="grid" id="backupIndexGrid"></div>
  </div>
  <div id="page-proxies" class="page" style="display:none">
    <div class="header">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <h1>🌐 智能代理池与订阅中心</h1>
        <div id="proxyStatsBar" class="status-bar"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn-primary" onclick="showImportSubscriptionModal()" style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;font-size:13px;border-radius:10px;">
          <span>⚡ 导入 Clash/V2Ray 订阅</span>
        </button>
        <button class="btn btn-secondary" onclick="showAddProxy()" style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text);cursor:pointer;transition:all 0.2s;">
          <span>+ 添加单节点</span>
        </button>
        <button class="btn btn-secondary" onclick="showDownloadPlannerModal()" style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text);cursor:pointer;transition:all 0.2s;">
          <span>🚀 极速下载策略助手</span>
        </button>
      </div>
    </div>

    <!-- Agent Automation Callout Banner -->
    <div style="margin:0 24px 20px;padding:12px 18px;border-radius:12px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.22);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#93c5fd;line-height:1.5;">
        <span style="font-size:18px;">🤖</span>
        <span><b>AI Agent 自动加速就绪</b>：本代理池所有节点已通过 MCP 协议自动接入集群调度中枢。AI Agent 访问海外资源或进行大文件下载时，将自动调用并分发直连 vs 代理竞速与多代理分片并发聚合拉取。</span>
      </div>
    </div>

    <div style="padding:0 24px 32px">
      <!-- Section 1: Subscriptions -->
      <div id="subscriptionSection" style="margin-bottom:28px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:16px;display:flex;align-items:center;gap:8px;color:#fff;font-weight:600;margin:0;">
            📡 活跃订阅源 (<span id="subCountBadge">0</span>)
          </h3>
        </div>
        <div id="subscriptionGrid" class="grid" style="padding:0;margin-bottom:16px"></div>
      </div>

      <!-- Section 2: Proxies -->
      <div id="proxyNodesSection">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="font-size:16px;display:flex;align-items:center;gap:8px;color:#fff;font-weight:600;margin:0;">
            ⚡ 可用代理节点池 (<span id="nodeCountBadge">0</span>)
          </h3>
        </div>
        <div id="proxyList" class="grid" style="padding:0"></div>
      </div>
    </div>
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
  <div id="page-gdrive" class="page" style="display:none">
    <div class="header">
      <div>
        <h1 style="font-size:22px;letter-spacing:-0.02em;font-weight:600;margin:0 0 4px">Google Drive 云端存储</h1>
        <div style="font-size:13px;color:#888" id="gdriveAccountSubtitle">实时浏览与检索云端模型权重、检查点及实验产物</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input class="search-input" id="gdriveSearchInput" placeholder="检索文件/权重 (如 best.pt, ceed)..." oninput="onGdriveSearchInput()" style="width:260px">
        <button class="btn btn-secondary" onclick="loadGdrive()" style="font-size:13px;padding:8px 14px">🔄 刷新</button>
        <button class="btn btn-secondary" onclick="openGdriveConfigModal()" style="font-size:13px;padding:8px 14px">⚙️ 云盘设置</button>
      </div>
    </div>

    <!-- Storage Quota & Status Bar (Apple monochrome) -->
    <div id="gdriveQuotaCard" style="margin:0 24px 16px;padding:14px 20px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:18px">☁️</div>
        <div>
          <div style="font-size:13px;font-weight:500;color:#fff" id="gdriveQuotaTitle">云盘连接状态</div>
          <div style="font-size:12px;color:#888" id="gdriveQuotaDetail">检测中...</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:20px" id="gdriveQuotaMetrics"></div>
    </div>

    <!-- Breadcrumb & Path Bar -->
    <div style="margin:0 24px 12px;display:flex;align-items:center;gap:8px;font-size:13px;color:#888;flex-wrap:wrap" id="gdriveBreadcrumbs">
      <span style="cursor:pointer;color:#fff" onclick="navigateGdriveBreadcrumb(0)">📁 根目录</span>
    </div>

    <!-- File Browser Table (Apple minimalist list) -->
    <div style="margin:0 24px 24px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
        <thead>
          <tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            <th style="padding:12px 16px;font-weight:500">名称</th>
            <th style="padding:12px 16px;font-weight:500;width:120px">大小</th>
            <th style="padding:12px 16px;font-weight:500;width:180px">修改时间</th>
            <th style="padding:12px 16px;font-weight:500;text-align:right;width:140px">操作</th>
          </tr>
        </thead>
        <tbody id="gdriveFileList">
          <tr><td colspan="4" style="text-align:center;padding:40px;color:#888">正在连接 Google Drive...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div id="modalContainer"></div>
  <script>
    let servers = [];
    let datasets = [];
    let backups = [];
    let proxies = [];
    let subscriptions = [];
    let logs = [];
    let currentPage = 'servers';
    let ragSearchTimer = null;

    function escHtml(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function safeGetStorage(key) {
      try { return localStorage.getItem(key) || ''; }
      catch (e) { return ''; }
    }

    function safeSetStorage(key, val) {
      try { localStorage.setItem(key, val); }
      catch (e) {}
    }

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
      subscriptions: () => fetch('/api/proxies/subscriptions').then(r => r.json()),
      createSubscription: (data) => fetch('/api/proxies/subscriptions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      syncSubscription: (id) => fetch('/api/proxies/subscriptions/'+id+'/sync', { method:'POST' }).then(r => r.json()),
      deleteSubscription: (id) => fetch('/api/proxies/subscriptions/'+id, { method:'DELETE' }).then(r => r.json()),
      logs: () => fetch('/api/usage').then(r => r.json()),
      recordUsage: (data) => fetch('/api/usage', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      claimServer: (id, agent, task, duration_minutes, server_expires_at) => fetch('/api/servers/'+id+'/claim', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({agent, task, duration_minutes, server_expires_at}) }).then(r => r.json()),
      setServerLease: (id, server_expires_at) => fetch('/api/servers/'+id+'/lease', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({server_expires_at}) }).then(r => r.json()),
      releaseServer: (id) => fetch('/api/servers/'+id+'/release', { method:'POST' }).then(r => r.json()),
      planBackup: (server_id, session_name, summary, has_google_drive, remote_data_dir) => fetch('/mcp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id: Date.now(), method:'tools/call', params:{name:'plan_server_backup', arguments:{server_id, session_name, summary, has_google_drive, remote_data_dir}}}) }).then(r => r.json()),
      planRelay: (target_server_id, resource_url) => fetch('/mcp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({jsonrpc:'2.0', id: Date.now(), method:'tools/call', params:{name:'plan_network_relay', arguments:{target_server_id, resource_url}}}) }).then(r => r.json()),
      pitfalls: (serverId) => fetch('/api/servers/' + serverId + '/pitfalls').then(r => r.json()),
      createPitfall: (serverId, data) => fetch('/api/servers/' + serverId + '/pitfalls', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json()),
      deletePitfall: (id) => fetch('/api/servers/pitfalls/' + id, { method:'DELETE' }).then(r => r.json()),
      knowledgeSearch: (q, category) => fetch('/api/knowledge/search?q=' + encodeURIComponent(q||'') + '&category=' + encodeURIComponent(category||'all')).then(r => r.json()),
      gdriveStatus: () => fetch('/api/gdrive/status').then(r => r.json()),
      gdriveFiles: (folderId, query, pageSize, pageToken) => {
        let url = '/api/gdrive/files?';
        if (folderId) url += 'folder_id=' + encodeURIComponent(folderId) + '&';
        if (query) url += 'query=' + encodeURIComponent(query) + '&';
        if (pageSize) url += 'page_size=' + encodeURIComponent(pageSize) + '&';
        if (pageToken) url += 'page_token=' + encodeURIComponent(pageToken) + '&';
        return fetch(url).then(r => r.json());
      },
      gdriveFile: (id) => fetch('/api/gdrive/file/' + id).then(r => r.json()),
      saveGdriveConfig: (service_account_json, root_folder_id) => fetch('/api/gdrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_account_json, root_folder_id })
      }).then(r => r.json()),
    };

    let knowledgeCategory = 'all';
    let knowledgeSearchTimer = null;
    let knowledgeItems = [];

    let gdriveCurrentFolder = '';
    let gdriveBreadcrumbs = [{ id: '', name: '根目录' }];
    let gdriveSearchTimer = null;

    function switchPage(page) {
      currentPage = page;
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      var targetPage = document.getElementById('page-'+page);
      if (targetPage) targetPage.style.display = 'block';
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      var navBtn = document.getElementById('nav-'+page);
      if (navBtn) navBtn.classList.add('active');
      if (page === 'servers') loadServers();
      else if (page === 'knowledge') loadKnowledge();
      else if (page === 'datasets') refreshDatasetsPage();
      else if (page === 'gdrive') loadGdrive();
      else if (page === 'proxies') loadProxies();
      else if (page === 'logs') loadLogs();
    }

    function onKnowledgeSearchInput() {
      if (knowledgeSearchTimer) clearTimeout(knowledgeSearchTimer);
      knowledgeSearchTimer = setTimeout(function() {
        loadKnowledge();
      }, 250);
    }

    function setKnowledgeCategory(cat) {
      knowledgeCategory = cat;
      ['all', 'pitfall', 'note', 'backup'].forEach(function(c) {
        var btn = document.getElementById('kCat-' + c);
        if (btn) {
          btn.className = (c === cat) ? 'btn btn-primary' : 'btn btn-secondary';
        }
      });
      loadKnowledge();
    }

    async function loadKnowledge() {
      const qInput = document.getElementById('knowledgeSearchInput');
      const q = qInput ? qInput.value.trim() : '';
      const grid = document.getElementById('knowledgeResultsGrid');
      if (!grid) return;

      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);"><div class="spinner" style="margin:0 auto 12px;"></div><span>正在检索全集群 RAG 知识库...</span></div>';

      try {
        const items = await API.knowledgeSearch(q, knowledgeCategory);
        knowledgeItems = Array.isArray(items) ? items : [];
        renderKnowledgeResults(knowledgeItems);
      } catch (err) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--red);">检索失败: ' + escHtml(err.message) + '</div>';
      }
    }

    function renderKnowledgeResults(items) {
      const grid = document.getElementById('knowledgeResultsGrid');
      if (!grid) return;
      grid.innerHTML = '';
      if (!items || items.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'grid-column:1/-1;padding:48px 20px;border:1px dashed rgba(255,255,255,0.12);border-radius:14px;text-align:center;background:rgba(255,255,255,0.015);';
        emptyDiv.innerHTML = '<div style="font-size:36px;margin-bottom:10px;">🔍</div>'
          + '<div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:6px;">未检索到匹配的排错或知识条目</div>'
          + '<div style="font-size:13px;color:var(--text-dim);max-width:480px;margin:0 auto;line-height:1.5;">您可以尝试精简搜索关键词（如 <code>CUDA</code>, <code>OOM</code>, <code>NCCL</code>, <code>timeout</code>, <code>pip</code>），或切换顶部知识分类。</div>';
        grid.appendChild(emptyDiv);
        return;
      }

      items.forEach(function(item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:0 0 32px 0;border-bottom:1px solid rgba(255,255,255,0.06);background:transparent;position:relative;display:flex;flex-direction:column;gap:16px;transition:all 0.2s ease;';

        // Top Row: Badges
        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;';

        // Type Badge
        const typeBadge = document.createElement('span');
        typeBadge.style.cssText = 'font-size:11px;font-weight:600;color:#888;letter-spacing:0.5px;border:1px solid rgba(255,255,255,0.1);padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.02);';
        if (item.source_type === 'pitfall') {
          typeBadge.textContent = '避坑经验';
        } else if (item.source_type === 'backup_index') {
          typeBadge.textContent = '实验备份';
        } else {
          typeBadge.textContent = '运维备忘';
        }
        topRow.appendChild(typeBadge);

        // Server Badge
        if (item.server_name || item.server_host) {
          const sBadge = document.createElement('span');
          sBadge.style.cssText = 'font-size:13px;color:#666;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;';
          sBadge.textContent = item.server_name || item.server_host;
          topRow.appendChild(sBadge);
        }

        // Score Badge
        if (item.score > 0) {
          const scoreBadge = document.createElement('span');
          scoreBadge.style.cssText = 'font-size:13px;color:#555;';
          scoreBadge.textContent = '· 匹配 ' + Math.min(100, Math.round(item.score * 2)) + '%';
          topRow.appendChild(scoreBadge);
        }

        card.appendChild(topRow);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size:18px;font-weight:500;color:#fff;line-height:1.4;letter-spacing:0.2px;';
        titleDiv.textContent = item.title;
        card.appendChild(titleDiv);

        // Problem summary
        if (item.problem_summary) {
          const pBox = document.createElement('div');
          pBox.style.cssText = 'font-size:14px;color:#aaa;line-height:1.6;white-space:pre-wrap;font-weight:400;';
          pBox.textContent = item.problem_summary;
          card.appendChild(pBox);
        }

        // Solution / Workaround Box
        if (item.workaround_or_content) {
          const solBox = document.createElement('div');
          solBox.style.cssText = 'font-size:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);padding:20px;border-radius:12px;display:flex;flex-direction:column;gap:16px;margin-top:8px;';

          const sHead = document.createElement('div');
          sHead.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
          sHead.innerHTML = '<span style="color:#666;font-weight:500;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">SOLUTION / COMMANDS</span>';

          const copyBtn = document.createElement('button');
          copyBtn.style.cssText = 'background:transparent;border:none;color:#666;font-size:12px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.2s;font-weight:500;';
          copyBtn.textContent = 'Copy';
          copyBtn.onmouseover = () => { copyBtn.style.color = '#fff'; copyBtn.style.background = 'rgba(255,255,255,0.05)'; };
          copyBtn.onmouseout = () => { copyBtn.style.color = '#666'; copyBtn.style.background = 'transparent'; };
          copyBtn.onclick = function() {
            navigator.clipboard.writeText(item.workaround_or_content);
            showToast('Copied to clipboard', 'success');
          };
          sHead.appendChild(copyBtn);
          solBox.appendChild(sHead);

          const sText = document.createElement('pre');
          sText.style.cssText = 'margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;color:#e5e5e5;white-space:pre-wrap;word-break:break-all;line-height:1.6;';
          sText.textContent = item.workaround_or_content;
          solBox.appendChild(sText);

          card.appendChild(solBox);
        }

        // Footer Tags & Match reasons
        if (item.relevance_reasons && item.relevance_reasons.length > 0 && item.relevance_reasons[0] !== '最新经验沉淀展示') {
          const reasonDiv = document.createElement('div');
          reasonDiv.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;margin-top:auto;';
          item.relevance_reasons.forEach(function(r) {
            const rTag = document.createElement('span');
            rTag.style.cssText = 'font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.04);color:var(--text-dim);';
            rTag.textContent = r;
            reasonDiv.appendChild(rTag);
          });
          card.appendChild(reasonDiv);
        }

        grid.appendChild(card);
      });
    }

    async function loadServers() {
      try {
        const data = await API.servers();
        servers = Array.isArray(data) ? data : [];
        renderServers();
      } catch (e) {
        console.error('Failed to load servers', e);
        var grid = document.getElementById('serverGrid');
        if (grid && (!servers || servers.length === 0)) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--red);">⚠️ 加载服务器失败: ' + escHtml(e.message) + '</div>';
        }
      }
    }
    async function loadProxies() {
      try {
        const [pData, sData] = await Promise.all([API.proxies(), API.subscriptions()]);
        proxies = Array.isArray(pData) ? pData : [];
        subscriptions = Array.isArray(sData) ? sData : [];
        renderSubscriptions();
        renderProxies();
      } catch (e) { console.error('Failed to load proxies/subscriptions', e); }
    }
    async function loadLogs() {
      try {
        const data = await API.logs();
        logs = Array.isArray(data) ? data : [];
        renderLogs();
      } catch (e) { console.error('Failed to load logs', e); }
    }

    function renderServers() {
      const searchInputEl = document.getElementById('searchInput');
      const search = (searchInputEl && searchInputEl.value ? searchInputEl.value : '').toLowerCase().trim();
      const serverList = Array.isArray(servers) ? servers : [];
      const filtered = serverList.filter(s => ((s.name || '') + ' ' + (s.host || '')).toLowerCase().includes(search));
      var isEnabled = function(s) { return s.enabled !== 0 && s.enabled !== false; };
      var online = filtered.filter(function(s){ return isEnabled(s) && s.status_online && wasRecentlyUsed(s); });
      var idle = filtered.filter(function(s){ return isEnabled(s) && s.status_online && !wasRecentlyUsed(s); });
      var offline = filtered.filter(function(s){ return isEnabled(s) && !s.status_online; });
      var disabled = filtered.filter(function(s){ return !isEnabled(s); });
      var statusBar = document.getElementById('statusBar');
      if (statusBar) {
        statusBar.innerHTML = '';
        [{label:'🟢 在线活跃 '+online.length},{label:'🟡 在线空闲 '+idle.length},{label:'🔴 离线 '+offline.length},{label:'⚪ 已禁用 '+disabled.length}].forEach(function(c) {
          var badge = document.createElement('span'); badge.className = 'status-badge'; badge.textContent = c.label; statusBar.appendChild(badge);
        });
      }
      var grid = document.getElementById('serverGrid');
      if (grid) {
        grid.innerHTML = '';
        const allCards = [...online, ...idle, ...offline, ...disabled];
        if (allCards.length === 0) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-dim);background:var(--card-bg);border:1px dashed var(--border);border-radius:12px;">' +
            '<div style="font-size:32px;margin-bottom:8px;">🖥️</div>' +
            '<div style="font-weight:600;margin-bottom:4px;font-size:16px;">暂未找到服务器</div>' +
            '<div style="font-size:13px;">' + (search ? '未匹配到搜索词 "' + escHtml(search) + '"，请尝试清空搜索框' : '点击右上角「+ 添加」按钮或通过 MCP 登记新服务器') + '</div>' +
            '</div>';
        } else {
          allCards.forEach(function(s) {
            try {
              var card = createServerCard(s);
              if (card) grid.appendChild(card);
            } catch (err) {
              console.error('Failed to create card for server', s, err);
            }
          });
        }
      }
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
      if (s.is_jump_host === 1 || s.is_jump_host === true) {
        var jumpBadge = document.createElement('span');
        jumpBadge.style.cssText = 'font-size:11px;padding:2px 7px;border-radius:4px;background:rgba(234,179,8,0.18);color:#facc15;border:1px solid rgba(234,179,8,0.35);margin-left:6px;font-weight:600;';
        jumpBadge.textContent = '🔀 跳板机';
        titleDiv.appendChild(jumpBadge);
      }
      if (!isEnabled) {
        var disabledBadge = document.createElement('span'); disabledBadge.style.cssText = 'font-size:11px;padding:2px 6px;border-radius:4px;background:var(--border);color:var(--text-dim);margin-left:6px';
        disabledBadge.textContent = '已禁用';
        titleDiv.appendChild(disabledBadge);
      }
      card.appendChild(titleDiv);

      // Info rows
      function addInfoRow(label, value, isHtml) {
        const row = document.createElement('div'); row.className = 'info-row';
        const labelSpan = document.createElement('span'); labelSpan.textContent = label;
        const valueSpan = document.createElement('span');
        if (isHtml) {
          valueSpan.innerHTML = value;
        } else {
          valueSpan.textContent = value;
        }
        row.appendChild(labelSpan); row.appendChild(valueSpan);
        card.appendChild(row);
      }
      if (s.is_jump_host === 1 || s.is_jump_host === true) {
        addInfoRow('角色', '<span style="color:#facc15;font-weight:600;">🔀 状态探针与中转跳板机</span>', true);
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
      addInfoRow('物理租期', leaseBadge, true);

      // Pitfall experience badge
      const pitfallCount = (s.pitfalls && s.pitfalls.length) || s.pitfalls_count || 0;
      let pitfallBadge = '';
      if (pitfallCount > 0) {
        pitfallBadge = '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);font-size:11px;font-weight:600;cursor:pointer;" title="点击查看避坑与经验指南">⚠️ ' + pitfallCount + ' 条避坑沉淀 ➔</span>';
      } else {
        pitfallBadge = '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.03);color:var(--text-dim);font-size:11px;cursor:pointer;">➕ 记录踩坑</span>';
      }
      addInfoRow('避坑经验', '<span onclick="showPitfallsModal(&quot;' + s.id + '&quot;)">' + pitfallBadge + '</span>', true);

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
      addActionBtn('⚠️ 踩坑' + (pitfallCount > 0 ? ' (' + pitfallCount + ')' : ''), () => showPitfallsModal(s.id));
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
        google_drive: { label: 'Google Drive 全量', color: '#aaa', bg: 'rgba(255,255,255,0.06)' },
        peer_server: { label: '对端中转', color: '#aaa', bg: 'rgba(255,255,255,0.06)' },
        local_weights: { label: '本地核心', color: '#aaa', bg: 'rgba(255,255,255,0.06)' },
      };

      backups.forEach(function(b) {
        const card = document.createElement('div');
        card.className = 'card';

        const tm = typeMeta[b.backup_type] || { label: b.backup_type, color: '#aaa', bg: 'rgba(255,255,255,0.06)' };

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.innerHTML = '<span style="color:#fff;font-weight:600;font-size:15px;line-height:1.4;word-break:break-all;overflow-wrap:anywhere;">' + escHtml(b.summary) + '</span>' +
          '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#aaa;font-weight:500;flex-shrink:0;white-space:nowrap;">' + tm.label + (b.score ? ' · ' + b.score + '分' : '') + '</span>';
        card.appendChild(titleDiv);

        // Info rows
        const addRow = function(label, valHtml) {
          const row = document.createElement('div'); row.className = 'info-row';
          const lbl = document.createElement('span'); lbl.textContent = label;
          const val = document.createElement('span'); val.innerHTML = valHtml;
          row.appendChild(lbl); row.appendChild(val);
          card.appendChild(row);
        };

        addRow('源服务器 IP', '<code style="font-size:12px;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">' + escHtml(b.server_host) + '</code>');
        addRow('任务会话', '<b>' + escHtml(b.session_name) + '</b>');
        addRow('存储路径', '<code style="font-size:12px;background:rgba(255,255,255,0.04);padding:3px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;overflow-wrap:anywhere;text-align:left;display:inline-block;">' + escHtml(b.remote_path) + '</code>');
        if (b.peer_server_host) {
          addRow('对端节点 IP', '<code style="font-size:12px;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">' + escHtml(b.peer_server_host) + '</code>');
        }
        if (b.purpose) addRow('数据用途', escHtml(b.purpose));
        if (b.usage_status) addRow('使用状态', escHtml(b.usage_status));
        if (b.relevance_reasons && b.relevance_reasons.length > 0) {
          addRow('RAG 匹配', '<span style="color:#aaa">' + escHtml(b.relevance_reasons.join(', ')) + '</span>');
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
          connBtn.textContent = '复制连接指令';
          connBtn.onclick = function() {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(b.peer_connect_cmd).then(function() {
                showToast('已复制对端连接指令', 'success');
              });
            } else {
              prompt('复制连接指令:', b.peer_connect_cmd);
            }
          };
          actionsDiv.appendChild(connBtn);
        }

        const copyPathBtn = document.createElement('button');
        copyPathBtn.textContent = '复制路径';
        copyPathBtn.onclick = function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(b.remote_path).then(function() {
              showToast('已复制存储路径', 'success');
            });
          } else {
            prompt('复制路径:', b.remote_path);
          }
        };
        actionsDiv.appendChild(copyPathBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger';
        delBtn.textContent = '删除索引';
        delBtn.onclick = async function() {
          if (confirm('确定从 RAG 库中删除此备份索引（' + b.summary + '）？')) {
            try {
              const res = await API.deleteBackup(b.id);
              if (res.success) {
                showToast('已删除备份索引', 'success');
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
        titleDiv.innerHTML = '<span style="color:#fff;font-weight:600;font-size:15px;line-height:1.4;word-break:break-all;overflow-wrap:anywhere;">' + escHtml(d.name) + '</span>' +
          '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#aaa;font-weight:500;flex-shrink:0;white-space:nowrap;">' + (d.size_gb > 0 ? d.size_gb + ' GB' : '未标大小') + '</span>';
        card.appendChild(titleDiv);

        // Info rows
        const addRow = function(label, valHtml) {
          const row = document.createElement('div'); row.className = 'info-row';
          const lbl = document.createElement('span'); lbl.textContent = label;
          const val = document.createElement('span'); val.innerHTML = valHtml;
          row.appendChild(lbl); row.appendChild(val);
          card.appendChild(row);
        };

        addRow('所在服务器', '<b>' + escHtml(d.server_name) + '</b> <span style="color:#666;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">(' + escHtml(d.server_host) + ':' + d.server_port + ')</span>');
        addRow('远端路径', '<code style="font-size:12px;background:rgba(255,255,255,0.04);padding:3px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;overflow-wrap:anywhere;text-align:left;display:inline-block;">' + escHtml(d.path) + '</code>');
        if (d.description) addRow('用途描述', escHtml(d.description));
        if (d.added_at) {
          const dt = new Date(d.added_at);
          addRow('登记时间', dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制亲和参数';
        copyBtn.onclick = function() {
          const snippet = 'preferred_datasets: ["' + d.name + '"]';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(snippet).then(function() {
              showToast('已复制亲和参数到剪贴板', 'success');
            }).catch(function() {
              prompt('请手动复制亲和参数:', snippet);
            });
          } else {
            prompt('请手动复制亲和参数:', snippet);
          }
        };
        actionsDiv.appendChild(copyBtn);

        const copyPathBtn = document.createElement('button');
        copyPathBtn.textContent = '复制路径';
        copyPathBtn.onclick = function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(d.path).then(function() {
              showToast('已复制远端路径', 'success');
            });
          } else {
            prompt('请手动复制路径:', d.path);
          }
        };
        actionsDiv.appendChild(copyPathBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'danger';
        delBtn.textContent = '移除登记';
        delBtn.onclick = async function() {
          if (confirm('确定从服务器 [' + d.server_name + '] 移除数据集 [' + d.name + '] 的登记？')) {
            try {
              const res = await API.removeDataset(d.server_id, d.name);
              if (res.success) {
                showToast('已移除数据集登记', 'success');
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

    function renderSubscriptions() {
      const subBadge = document.getElementById('subCountBadge');
      if (subBadge) subBadge.textContent = subscriptions.length;
      const container = document.getElementById('subscriptionGrid');
      if (!container) return;
      container.innerHTML = '';

      if (subscriptions.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'grid-column:1/-1;padding:32px 20px;border:1px dashed rgba(255,255,255,0.12);border-radius:14px;text-align:center;background:rgba(255,255,255,0.015);';
        emptyDiv.innerHTML = '<div style="font-size:32px;margin-bottom:8px;">📡</div>'
          + '<div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:6px;">暂未绑定任何订阅源</div>'
          + '<div style="font-size:13px;color:var(--text-dim);max-width:480px;margin:0 auto 16px;line-height:1.5;">支持导入 Clash YAML 与 V2Ray Base64 订阅链接。导入后系统将自动批量解析节点，并支持一键定时同步。</div>'
          + '<button class="btn-primary" style="font-size:13px;padding:8px 18px;" id="empty-sub-add-btn">⚡ 导入第一个订阅</button>';
        const btn = emptyDiv.querySelector('#empty-sub-add-btn');
        if (btn) btn.onclick = showImportSubscriptionModal;
        container.appendChild(emptyDiv);
        return;
      }

      subscriptions.forEach(sub => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'padding:20px;border-radius:14px;background:var(--card-bg);border:1px solid var(--border);position:relative;display:flex;flex-direction:column;gap:12px;transition:all 0.25s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);';

        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:700;font-size:16px;color:#fff;display:flex;align-items:center;gap:8px;';
        titleSpan.innerHTML = '<span style="font-size:18px;">📡</span> ' + escHtml(sub.name);
        titleRow.appendChild(titleSpan);

        const countBadge = document.createElement('span');
        countBadge.style.cssText = 'padding:3px 10px;border-radius:8px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);font-size:12px;font-weight:600;';
        countBadge.textContent = (sub.node_count || 0) + ' 个节点';
        titleRow.appendChild(countBadge);
        card.appendChild(titleRow);

        const urlP = document.createElement('div');
        urlP.style.cssText = 'font-size:12px;color:var(--text-dim);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:8px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.05);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;';
        urlP.title = '点击复制订阅链接: ' + sub.url;
        urlP.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;">' + escHtml(sub.url) + '</span><span style="font-size:12px;opacity:0.7;">📋</span>';
        urlP.onclick = function() {
          navigator.clipboard.writeText(sub.url);
          showToast('已复制订阅 URL', 'success');
        };
        card.appendChild(urlP);

        const syncInfo = document.createElement('div');
        syncInfo.style.cssText = 'font-size:12px;color:var(--text-dim);display:flex;justify-content:space-between;align-items:center;';
        syncInfo.innerHTML = '<span>🕒 最后同步: <b style="color:var(--text);">' + (sub.last_synced_at ? new Date(sub.last_synced_at).toLocaleString() : '未同步') + '</b></span>';
        card.appendChild(syncInfo);

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;margin-top:auto;';

        const syncBtn = document.createElement('button');
        syncBtn.className = 'btn btn-secondary';
        syncBtn.style.cssText = 'flex:1;padding:6px 12px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:4px;';
        syncBtn.innerHTML = '<span>🔄 立即同步</span>';
        syncBtn.onclick = () => syncSubscriptionNow(sub.id);
        actions.appendChild(syncBtn);

        const delBtn = document.createElement('button');
        delBtn.style.cssText = 'padding:6px 14px;font-size:12px;background:transparent;border:1px solid rgba(239,68,68,0.4);color:var(--red);border-radius:8px;cursor:pointer;transition:all 0.2s;';
        delBtn.innerHTML = '🗑️ 删除';
        delBtn.onmouseenter = () => { delBtn.style.background = 'rgba(239,68,68,0.15)'; };
        delBtn.onmouseleave = () => { delBtn.style.background = 'transparent'; };
        delBtn.onclick = () => deleteSubscriptionConfirm(sub.id, sub.name);
        actions.appendChild(delBtn);

        card.appendChild(actions);
        container.appendChild(card);
      });
    }

    function renderProxies() {
      const nodeBadge = document.getElementById('nodeCountBadge');
      if (nodeBadge) nodeBadge.textContent = proxies.length;

      const statsBar = document.getElementById('proxyStatsBar');
      if (statsBar) {
        statsBar.innerHTML = '';
        const socks5Count = proxies.filter(p => (p.protocol||'socks5') === 'socks5').length;
        const httpCount = proxies.filter(p => p.protocol === 'http').length;
        [
          { label: '⚡ 总节点: ' + proxies.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
          { label: '🧦 SOCKS5: ' + socks5Count, color: '#818cf8', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' },
          { label: '🌐 HTTP: ' + httpCount, color: '#22d3ee', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' }
        ].forEach(c => {
          const b = document.createElement('span');
          b.style.cssText = 'padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;color:' + c.color + ';background:' + c.bg + ';border:1px solid ' + c.border + ';';
          b.textContent = c.label;
          statsBar.appendChild(b);
        });
      }

      const container = document.getElementById('proxyList');
      if (!container) return;
      container.innerHTML = '';

      if (proxies.length === 0) {
        const emptyP = document.createElement('div');
        emptyP.style.cssText = 'grid-column:1/-1;color:var(--text-dim);padding:36px 20px;text-align:center;border:1px dashed rgba(255,255,255,0.12);border-radius:14px;background:rgba(255,255,255,0.015);';
        emptyP.innerHTML = '<div style="font-size:32px;margin-bottom:8px;">⚡</div>'
          + '<div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:6px;">暂无代理节点</div>'
          + '<div style="font-size:13px;color:var(--text-dim);max-width:480px;margin:0 auto 16px;line-height:1.5;">您可以点击上方 <b>⚡ 导入 Clash/V2Ray 订阅</b> 批量导入，或点击 <b>+ 添加单节点</b> 手动录入。</div>'
          + '<div style="display:flex;justify-content:center;gap:10px;">'
          + '<button class="btn-primary" style="font-size:13px;padding:8px 16px;" id="empty-proxy-import-btn">⚡ 导入订阅</button>'
          + '<button class="btn btn-secondary" style="font-size:13px;padding:8px 16px;" id="empty-proxy-add-btn">+ 添加节点</button>'
          + '</div>';
        const b1 = emptyP.querySelector('#empty-proxy-import-btn');
        if (b1) b1.onclick = showImportSubscriptionModal;
        const b2 = emptyP.querySelector('#empty-proxy-add-btn');
        if (b2) b2.onclick = showAddProxy;
        container.appendChild(emptyP);
        return;
      }

      proxies.forEach(p => {
        const proto = (p.protocol || 'socks5').toLowerCase();
        const isSocks5 = proto === 'socks5';
        const proxyFullUrl = proto + '://' + (p.username ? encodeURIComponent(p.username) + ':' + encodeURIComponent(p.password || '') + '@' : '') + p.host + ':' + p.port;
        const proxyCleanUrl = proto + '://' + p.host + ':' + p.port;

        const card = document.createElement('div');
        card.className = 'proxy-card';
        card.style.cssText = 'background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;transition:all 0.25s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);position:relative;';

        // Top Header: Name, Protocol, Region, Delete Button
        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;';

        const titleGroup = document.createElement('div');
        titleGroup.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;flex:1;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-weight:700;font-size:16px;color:#fff;letter-spacing:-0.2px;';
        nameSpan.textContent = p.name || p.host;
        titleGroup.appendChild(nameSpan);

        // Protocol Badge
        const protoBadge = document.createElement('span');
        protoBadge.style.cssText = 'padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.5px;'
          + (isSocks5 ? 'background:rgba(99,102,241,0.18);color:#a5b4fc;border:1px solid rgba(99,102,241,0.35);' : 'background:rgba(6,182,212,0.18);color:#67e8f9;border:1px solid rgba(6,182,212,0.35);');
        protoBadge.textContent = proto.toUpperCase();
        titleGroup.appendChild(protoBadge);

        // Region Badge
        if (p.region || p.location) {
          const reg = p.region || p.location;
          let flag = '🌐';
          if (reg.includes('HK') || reg.includes('香港') || reg.includes('Hong') || reg.includes('HoKONG')) flag = '🇭🇰';
          else if (reg.includes('TW') || reg.includes('台湾')) flag = '🇹🇼';
          else if (reg.includes('JP') || reg.includes('日本') || reg.includes('Tokyo')) flag = '🇯🇵';
          else if (reg.includes('SG') || reg.includes('新加坡')) flag = '🇸🇬';
          else if (reg.includes('US') || reg.includes('美国')) flag = '🇺🇸';
          else if (reg.includes('KR') || reg.includes('韩国')) flag = '🇰🇷';
          else if (reg.includes('UK') || reg.includes('英国')) flag = '🇬🇧';
          else if (reg.includes('DE') || reg.includes('德国')) flag = '🇩🇪';

          const regBadge = document.createElement('span');
          regBadge.style.cssText = 'padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.25);display:inline-flex;align-items:center;gap:4px;';
          regBadge.innerHTML = flag + ' <span>' + escHtml(reg) + '</span>';
          titleGroup.appendChild(regBadge);
        }

        topRow.appendChild(titleGroup);

        // Delete Button (Top Right)
        const delBtn = document.createElement('button');
        delBtn.style.cssText = 'padding:4px 8px;font-size:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);color:var(--red);border-radius:6px;cursor:pointer;transition:all 0.2s;flex-shrink:0;';
        delBtn.title = '删除此代理节点';
        delBtn.innerHTML = '🗑️';
        delBtn.onmouseenter = () => { delBtn.style.background = 'rgba(239,68,68,0.2)'; };
        delBtn.onmouseleave = () => { delBtn.style.background = 'rgba(239,68,68,0.06)'; };
        delBtn.onclick = () => deleteProxyConfirm(p.id);
        topRow.appendChild(delBtn);

        card.appendChild(topRow);

        // Middle: Endpoint Code Box
        const endBox = document.createElement('div');
        endBox.style.cssText = 'padding:8px 12px;border-radius:8px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;transition:border-color 0.2s;';
        endBox.title = '点击直接复制节点 URL';
        endBox.onmouseenter = () => { endBox.style.borderColor = 'rgba(59,130,246,0.4)'; };
        endBox.onmouseleave = () => { endBox.style.borderColor = 'rgba(255,255,255,0.06)'; };
        
        const epText = document.createElement('span');
        epText.style.cssText = 'font-family:monospace;font-size:13px;color:#93c5fd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        epText.textContent = proxyCleanUrl;
        endBox.appendChild(epText);

        const authTag = document.createElement('span');
        authTag.style.cssText = 'font-size:11px;padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;';
        if (p.username) {
          authTag.style.background = 'rgba(234,179,8,0.12)';
          authTag.style.color = '#fde047';
          authTag.style.border = '1px solid rgba(234,179,8,0.25)';
          authTag.textContent = '🔒 已鉴权 (' + escHtml(p.username) + ')';
        } else {
          authTag.style.background = 'rgba(255,255,255,0.05)';
          authTag.style.color = 'var(--text-dim)';
          authTag.textContent = '🔓 免密';
        }
        endBox.appendChild(authTag);

        endBox.onclick = function() {
          navigator.clipboard.writeText(proxyFullUrl);
          showToast('已复制节点 URL: ' + proxyFullUrl, 'success');
        };
        card.appendChild(endBox);

        // Bottom Action Bar: Fast Copy Commands
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:auto;flex-wrap:wrap;';

        function createActionBtn(label, textToCopy, toastMsg) {
          const b = document.createElement('button');
          b.className = 'btn btn-secondary';
          b.style.cssText = 'flex:1;min-width:85px;padding:6px 8px;font-size:11px;font-weight:600;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);color:var(--text);cursor:pointer;white-space:nowrap;transition:all 0.2s;';
          b.textContent = label;
          b.onclick = function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(textToCopy);
            showToast(toastMsg, 'success');
          };
          return b;
        }

        // 1. Copy URL
        btnRow.appendChild(createActionBtn('📋 复制 URL', proxyFullUrl, '已复制代理 URL'));
        // 2. Copy Export Env
        const exportCmd = 'export http_proxy="http://' + p.host + ':' + p.port + '" https_proxy="http://' + p.host + ':' + p.port + '" ALL_PROXY="' + proto + '://' + p.host + ':' + p.port + '"';
        btnRow.appendChild(createActionBtn('⚡ 复制 export', exportCmd, '已复制 Shell 环境变量 export 命令'));
        // 3. Copy SSH ProxyJump
        const sshProxyCmd = 'ssh -o ProxyCommand="nc -X 5 -x ' + p.host + ':' + p.port + ' %h %p"';
        btnRow.appendChild(createActionBtn('🌐 复制 SSH Jump', sshProxyCmd, '已复制 SSH ProxyCommand 参数'));

        card.appendChild(btnRow);
        container.appendChild(card);
      });
    }

    function showImportSubscriptionModal() {
      const modalContent = document.createElement('div');
      const h2 = document.createElement('h2');
      h2.textContent = '⚡ 导入 Clash / V2Ray 订阅链接';
      modalContent.appendChild(h2);

      const desc = document.createElement('p');
      desc.style.cssText = 'color:var(--text-dim);font-size:13px;margin-bottom:16px;line-height:1.5;';
      desc.textContent = '直接填入机场或服务商提供的 Clash YAML 订阅链接或 V2Ray Base64 订阅 URL，系统将自动拉取、解码并批量导入所有可用节点。';
      modalContent.appendChild(desc);

      function addFormGroup(label, inputHtml) {
        const g = document.createElement('div'); g.className = 'form-group';
        const l = document.createElement('label'); l.textContent = label; g.appendChild(l);
        const w = document.createElement('div'); w.innerHTML = inputHtml; g.appendChild(w.firstChild);
        modalContent.appendChild(g);
      }

      addFormGroup('订阅名称 (备注)', '<input id="sub-name" type="text" placeholder="例如: 机场主订阅, 备用高速专线">');
      addFormGroup('订阅 URL 链接', '<input id="sub-url" type="text" placeholder="https://api.example.com/link/... 或 clash yaml 链接">');
      addFormGroup('或者直接粘贴订阅内容 (YAML 或 Base64 文本)', '<textarea id="sub-raw" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;font-size:12px" placeholder="如果订阅 URL 无法直连访问，可在此直接粘贴 YAML 文本或 Base64 编码字符串..."></textarea>');

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'modal-actions';
      actionsDiv.style.marginTop = '24px';

      const importBtn = document.createElement('button');
      importBtn.className = 'btn btn-primary';
      importBtn.textContent = '🚀 开始解析并导入';
      importBtn.onclick = async function() {
        const nameVal = document.getElementById('sub-name').value.trim();
        const urlVal = document.getElementById('sub-url').value.trim();
        const rawVal = document.getElementById('sub-raw').value.trim();

        if (!urlVal && !rawVal) {
          showToast('请填写订阅 URL 或粘贴订阅文本内容', 'error');
          return;
        }

        importBtn.disabled = true; importBtn.textContent = '正在解析节点...';
        try {
          const res = await API.createSubscription({
            name: nameVal || undefined,
            url: urlVal || undefined,
            raw_content: rawVal || undefined,
          });
          if (res.success) {
            showToast(res.message || '✔ 成功导入订阅！', 'success');
            closeModal();
            loadProxies();
          } else {
            showToast('导入失败: ' + (res.error || '未知错误'), 'error');
            importBtn.disabled = false; importBtn.textContent = '开始解析并导入';
          }
        } catch (e) {
          showToast('网络请求错误: ' + e.message, 'error');
          importBtn.disabled = false; importBtn.textContent = '开始解析并导入';
        }
      };
      actionsDiv.appendChild(importBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = '取消';
      cancelBtn.onclick = closeModal;
      actionsDiv.appendChild(cancelBtn);

      modalContent.appendChild(actionsDiv);
      showModalWithElement(modalContent);
    }

    async function syncSubscriptionNow(id) {
      showToast('⏳ 正在同步订阅节点...');
      try {
        const res = await API.syncSubscription(id);
        if (res.success) {
          showToast(res.message || '✔ 成功同步订阅！', 'success');
          loadProxies();
        } else {
          showToast('同步失败: ' + (res.error || '未知错误'), 'error');
        }
      } catch (e) {
        showToast('网络错误: ' + e.message, 'error');
      }
    }

    async function deleteSubscriptionConfirm(id, name) {
      if (!confirm('确定要删除订阅 [' + (name || id) + '] 吗？该订阅关联的所有代理节点也将一并清除。')) return;
      try {
        const res = await API.deleteSubscription(id);
        if (res.success) {
          showToast('✔ 已删除订阅及关联节点', 'success');
          loadProxies();
        } else {
          showToast('删除失败: ' + (res.error || '未知错误'), 'error');
        }
      } catch (e) {
        showToast('网络错误: ' + e.message, 'error');
      }
    }

    function showDownloadPlannerModal(prefillServerId) {
      if (!servers || servers.length === 0) {
        showToast('请先添加至少一台服务器', 'error');
        return;
      }
      const modalContent = document.createElement('div');
      modalContent.style.cssText = 'max-width:880px;width:100%;';

      // Header with Agent Identity and Badges
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);';
      headerDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<span style="font-size:24px;">🤖</span>'
        + '<span style="font-size:20px;font-weight:700;color:#fff;">Agent 极速下载与分片调度控制台</span>'
        + '</div>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span style="font-family:monospace;font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">MCP: plan_network_relay</span>'
        + '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);font-weight:600;">AI AGENT READY</span>'
        + '</div>'
        + '</div>'
        + '<div style="font-size:13px;color:var(--text-dim);line-height:1.5;">'
        + '面向 AI Agent (Antigravity / Claude Code / Codex) 的自动化下载调度中枢。输入目标直链即时分析源站画像，输出【直连 vs 代理并发 Range 竞速脚本】、【64MB 多代理分片并发聚合拉取器】及标准 MCP 调用 Payload。'
        + '</div>';
      modalContent.appendChild(headerDiv);

      // SOP 6-Step Visual Workflow Ribbon
      const sopRibbon = document.createElement('div');
      sopRibbon.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:8px 12px;margin-bottom:16px;overflow-x:auto;font-size:11px;';
      sopRibbon.innerHTML = '<span style="color:#94a3b8;font-weight:600;white-space:nowrap;">🧭 Agent 下载 SOP:</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.25);white-space:nowrap;">① 查 Workers RAG</span>'
        + '<span style="color:var(--text-dim)">➔</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.25);white-space:nowrap;">② 搜全网直链</span>'
        + '<span style="color:var(--text-dim)">➔</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(234,179,8,0.15);color:#fde047;border:1px solid rgba(234,179,8,0.25);white-space:nowrap;">③ 直连/代理竞速</span>'
        + '<span style="color:var(--text-dim)">➔</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(168,85,247,0.15);color:#d8b4fe;border:1px solid rgba(168,85,247,0.25);white-space:nowrap;">④ 多代理分片并发 (>500M)</span>'
        + '<span style="color:var(--text-dim)">➔</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.25);white-space:nowrap;">⑤ 本地中转保底</span>'
        + '<span style="color:var(--text-dim)">➔</span>'
        + '<span style="padding:2px 6px;border-radius:4px;background:rgba(34,197,94,0.15);color:#86efac;border:1px solid rgba(34,197,94,0.25);white-space:nowrap;">⑥ 就地登记</span>';
      modalContent.appendChild(sopRibbon);

      // Form Input Section
      const formBox = document.createElement('div');
      formBox.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';

      // Server select
      let sOptions = '';
      servers.forEach(function(s) {
        const sel = (s.id === prefillServerId) ? ' selected' : '';
        const gpuStr = s.gpu_model ? (' · ' + s.gpu_model + (s.gpu_memory_gb ? ' ' + s.gpu_memory_gb + 'G' : '')) : '';
        sOptions += '<option value="' + s.id + '"' + sel + '>' + escHtml(s.name) + ' (' + escHtml(s.host) + gpuStr + (s.status_online ? ' · 🟢 在线' : ' · 🔴 离线') + ')</option>';
      });
      const sGroup = document.createElement('div');
      sGroup.className = 'form-group';
      sGroup.innerHTML = '<label style="font-weight:600;color:#fff;">执行目标算力服务器</label>'
        + '<select id="dl-server" style="background:var(--bg);font-size:13px;">' + sOptions + '</select>';
      formBox.appendChild(sGroup);

      // URL input
      const uGroup = document.createElement('div');
      uGroup.className = 'form-group';
      uGroup.style.marginBottom = '8px';
      uGroup.innerHTML = '<label style="font-weight:600;color:#fff;">目标资源直链 (Resource URL)</label>'
        + '<input id="dl-url" type="text" style="font-family:monospace;font-size:13px;background:var(--bg);" placeholder="https://huggingface.co/.../model.safetensors 或 https://github.com/..." value="https://huggingface.co/meta-llama/Meta-Llama-3-8B/resolve/main/model-00001-of-00004.safetensors">';
      formBox.appendChild(uGroup);

      // Preset Chips for Agent & Operator testing
      const presetRow = document.createElement('div');
      presetRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;align-items:center;';
      presetRow.innerHTML = '<span style="font-size:11px;color:var(--text-dim);">⚡ 快速预设:</span>';

      const presets = [
        { label: '🤗 HF Llama-3 Safetensors', url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B/resolve/main/model-00001-of-00004.safetensors' },
        { label: '📦 ModelScope Qwen2.5', url: 'https://www.modelscope.cn/models/qwen/Qwen2.5-7B-Instruct/resolve/master/model.safetensors' },
        { label: '🐙 GitHub Release ZIP', url: 'https://github.com/vllm-project/vllm/archive/refs/tags/v0.6.0.zip' },
        { label: '⚡ 清华 PyPI 镜像', url: 'https://pypi.tuna.tsinghua.edu.cn/simple/torch/' },
        { label: '🪣 S3 / R2 存储桶', url: 'https://datasets-hub.s3.amazonaws.com/checkpoints/model.bin' }
      ];

      presets.forEach(function(p) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--text);cursor:pointer;transition:all 0.15s;';
        chip.textContent = p.label;
        chip.onmouseover = function() { chip.style.background = 'rgba(59,130,246,0.15)'; chip.style.borderColor = 'rgba(59,130,246,0.4)'; };
        chip.onmouseout = function() { chip.style.background = 'rgba(255,255,255,0.04)'; chip.style.borderColor = 'rgba(255,255,255,0.1)'; };
        chip.onclick = function() {
          const urlInput = document.getElementById('dl-url');
          if (urlInput) urlInput.value = p.url;
        };
        presetRow.appendChild(chip);
      });
      formBox.appendChild(presetRow);

      // Action Toolbar
      const btnToolbar = document.createElement('div');
      btnToolbar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      const planBtn = document.createElement('button');
      planBtn.className = 'btn-primary';
      planBtn.style.cssText = 'flex:2;min-width:200px;padding:10px 16px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:6px;';
      planBtn.innerHTML = '<span>⚡ 生成 Agent 调度方案</span>';

      const copyMcpBtn = document.createElement('button');
      copyMcpBtn.className = 'btn btn-secondary';
      copyMcpBtn.style.cssText = 'flex:1;min-width:140px;padding:10px 12px;font-size:13px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:var(--text);cursor:pointer;';
      copyMcpBtn.innerHTML = '📋 复制 MCP 调用 JSON';
      copyMcpBtn.onclick = function() {
        const sId = document.getElementById('dl-server').value;
        const u = document.getElementById('dl-url').value.trim();
        navigator.clipboard.writeText(JSON.stringify({ target_server_id: sId, resource_url: u }, null, 2));
        showToast('已复制 plan_network_relay 调用参数', 'success');
      };

      const copyPromptBtn = document.createElement('button');
      copyPromptBtn.className = 'btn btn-secondary';
      copyPromptBtn.style.cssText = 'flex:1;min-width:140px;padding:10px 12px;font-size:13px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:var(--text);cursor:pointer;';
      copyPromptBtn.innerHTML = '💬 复制 Agent 指令 Prompt';
      copyPromptBtn.onclick = function() {
        const sId = document.getElementById('dl-server').value;
        const sEl = document.getElementById('dl-server');
        const sName = sEl ? sEl.options[sEl.selectedIndex].text.split(' (')[0] : '目标服务器';
        const u = document.getElementById('dl-url').value.trim();
        const promptText = [
          '请调用 plan_network_relay 工具为服务器 [' + sName + '] (' + sId + ') 规划资源下载方案：',
          '- 下载目标 URL: ' + u,
          '- 遵循 6 步下载 SOP：先进行直连 vs 代理并发测速竞速（哪个快选哪个）；若文件 >500MB 则启动 multi_proxy_downloader.py 进行多代理分片并发聚合拉取；下载完成后必须调用 register_dataset 登记数据集。'
        ].join(String.fromCharCode(10));
        navigator.clipboard.writeText(promptText);
        showToast('已复制 Agent 指令 Prompt', 'success');
      };

      btnToolbar.appendChild(planBtn);
      btnToolbar.appendChild(copyMcpBtn);
      btnToolbar.appendChild(copyPromptBtn);
      formBox.appendChild(btnToolbar);
      modalContent.appendChild(formBox);

      // Results container
      const resultBox = document.createElement('div');
      resultBox.id = 'dl-plan-result';
      resultBox.style.cssText = 'margin-top:20px;display:none;';
      modalContent.appendChild(resultBox);

      planBtn.onclick = async function() {
        const sId = document.getElementById('dl-server').value;
        const urlVal = document.getElementById('dl-url').value.trim();
        if (!urlVal) { showToast('请输入资源下载 URL', 'error'); return; }

        planBtn.disabled = true;
        planBtn.innerHTML = '<span>⏳ 正在分析源站画像并匹配代理池...</span>';

        try {
          const resp = await API.planRelay(sId, urlVal);
          planBtn.disabled = false;
          planBtn.innerHTML = '<span>⚡ 重新生成调度方案</span>';

          if (resp && resp.result && resp.result.content) {
            const data = JSON.parse(resp.result.content[0].text);
            resultBox.style.display = 'block';
            resultBox.innerHTML = '';

            // Top Domain Profiling Card
            const domInfo = data.target_domain_info || {};
            const dCard = document.createElement('div');
            dCard.style.cssText = 'padding:16px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.25);border-radius:12px;margin-bottom:16px;';
            dCard.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">'
              + '<div style="display:flex;align-items:center;gap:8px;">'
              + '<span style="font-weight:700;color:#93c5fd;font-size:15px;">🎯 目标源站画像: ' + escHtml(domInfo.domain || '通用源站') + '</span>'
              + '<span class="tag" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.4);font-weight:600;">' + escHtml(domInfo.category || 'GENERAL') + '</span>'
              + '</div>'
              + '<span style="font-size:12px;padding:3px 8px;border-radius:6px;background:rgba(234,179,8,0.15);color:#fde047;border:1px solid rgba(234,179,8,0.3);">'
              + '建议策略: ' + escHtml(domInfo.recommended_strategy || 'BENCHMARK_RACE')
              + '</span>'
              + '</div>'
              + '<div style="font-size:13px;color:var(--text);line-height:1.5;">' + escHtml(domInfo.recommendation || data.how_to) + '</div>';
            resultBox.appendChild(dCard);

            // Segmented Tabs Container
            const tabsNav = document.createElement('div');
            tabsNav.style.cssText = 'display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:14px;padding-bottom:2px;overflow-x:auto;';

            const tabContents = document.createElement('div');

            function createTabBtn(label, tabId, active) {
              const b = document.createElement('button');
              b.type = 'button';
              b.style.cssText = 'padding:8px 14px;border-radius:8px 8px 0 0;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;color:' + (active ? '#fff' : 'var(--text-dim)') + ';border-bottom:2px solid ' + (active ? 'var(--accent)' : 'transparent') + ';transition:all 0.2s;white-space:nowrap;';
              b.textContent = label;
              b.onclick = function() {
                Array.from(tabsNav.children).forEach(el => {
                  el.style.color = 'var(--text-dim)';
                  el.style.borderBottom = '2px solid transparent';
                });
                b.style.color = '#fff';
                b.style.borderBottom = '2px solid var(--accent)';
                Array.from(tabContents.children).forEach(c => c.style.display = 'none');
                const target = document.getElementById(tabId);
                if (target) target.style.display = 'block';
              };
              return b;
            }

            // Tab 1: Strategy A (Race)
            const tabBtnA = createTabBtn('⚡ 策略 A：直连 vs 代理竞速', 'tab-content-a', true);
            // Tab 2: Strategy B (Chunk Aggregator)
            const tabBtnB = createTabBtn('🚀 策略 B：多代理分片并发 (>500MB)', 'tab-content-b', false);
            // Tab 3: Unified Env
            const tabBtnC = createTabBtn('🌐 统一环境套件 (proxy_env.sh)', 'tab-content-c', false);
            // Tab 4: Agent MCP JSON & Prompt
            const tabBtnD = createTabBtn('🤖 Agent MCP Payload & 提示词', 'tab-content-d', false);

            tabsNav.appendChild(tabBtnA);
            tabsNav.appendChild(tabBtnB);
            tabsNav.appendChild(tabBtnC);
            tabsNav.appendChild(tabBtnD);
            resultBox.appendChild(tabsNav);

            // === Content A: Speed test benchmark race ===
            const paneA = document.createElement('div');
            paneA.id = 'tab-content-a';
            paneA.style.display = 'block';
            if (data.direct_vs_proxy_speed_test) {
              const st = data.direct_vs_proxy_speed_test;
              const box = document.createElement('div');
              box.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;';
              
              const hRow = document.createElement('div');
              hRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
              hRow.innerHTML = '<span style="font-weight:600;font-size:14px;color:#fff;">⚡ 直连 vs. 代理池并发同源 Range 测速竞速脚本</span>';
              
              const copyScriptBtn = document.createElement('button');
              copyScriptBtn.className = 'btn btn-secondary';
              copyScriptBtn.style.cssText = 'font-size:12px;padding:4px 10px;';
              copyScriptBtn.textContent = '📋 复制完整竞速脚本';
              copyScriptBtn.onclick = function() {
                navigator.clipboard.writeText(st.benchmark_and_pick_fastest_script);
                showToast('已复制竞速脚本', 'success');
              };
              hRow.appendChild(copyScriptBtn);
              box.appendChild(hRow);

              const sub = document.createElement('div');
              sub.style.cssText = 'font-size:12px;color:var(--text-dim);margin-bottom:10px;';
              sub.textContent = '对【直连物理网卡】与【代理池全部节点】发起 3~5 秒同源并发探测，实测直连更快则直连极速拉取；代理更快则切入最快代理。';
              box.appendChild(sub);

              const pre = document.createElement('pre');
              pre.style.cssText = 'max-height:220px;overflow-y:auto;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:8px;font-size:11px;color:#93c5fd;font-family:monospace;white-space:pre-wrap;line-height:1.5;';
              pre.textContent = st.benchmark_and_pick_fastest_script;
              box.appendChild(pre);
              paneA.appendChild(box);
            }
            tabContents.appendChild(paneA);

            // === Content B: Multi-proxy chunk aggregator ===
            const paneB = document.createElement('div');
            paneB.id = 'tab-content-b';
            paneB.style.display = 'none';
            if (data.multi_proxy_chunk_downloader) {
              const mp = data.multi_proxy_chunk_downloader;
              const box = document.createElement('div');
              box.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;';

              const hRow = document.createElement('div');
              hRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
              hRow.innerHTML = '<span style="font-weight:600;font-size:14px;color:#fff;">🚀 多代理协同分片并发聚合拉取 (Multi-Proxy Chunk Aggregator)</span>';

              const copyPyBtn = document.createElement('button');
              copyPyBtn.className = 'btn btn-secondary';
              copyPyBtn.style.cssText = 'font-size:12px;padding:4px 10px;';
              copyPyBtn.textContent = '📋 复制 Python 3 源码';
              copyPyBtn.onclick = function() {
                navigator.clipboard.writeText(mp.python_script_content);
                showToast('已复制 Python 3 下载器源码', 'success');
              };
              hRow.appendChild(copyPyBtn);
              box.appendChild(hRow);

              const sub = document.createElement('div');
              sub.style.cssText = 'font-size:12px;color:var(--text-dim);margin-bottom:10px;line-height:1.4;';
              sub.textContent = '零外部依赖（纯 Python 3 标准库）。将大文件切为 64MB/Chunk 分配给多个代理同时拉取合并，单个分片受阻自动 Failover 切换备用代理接力重试，支持断点续传。';
              box.appendChild(sub);

              const cmdTitle = document.createElement('div');
              cmdTitle.style.cssText = 'font-size:12px;font-weight:600;color:#fff;margin-bottom:6px;';
              cmdTitle.textContent = '一键运行命令:';
              box.appendChild(cmdTitle);

              const cmdRow = document.createElement('div');
              cmdRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';

              const inputEl = document.createElement('input');
              inputEl.readOnly = true;
              inputEl.style.cssText = 'flex:1;font-family:monospace;font-size:12px;padding:8px 10px;background:rgba(0,0,0,0.3);';
              inputEl.value = mp.execution_command;
              cmdRow.appendChild(inputEl);

              const copyCmdBtn = document.createElement('button');
              copyCmdBtn.className = 'btn-primary';
              copyCmdBtn.style.cssText = 'font-size:12px;padding:8px 14px;white-space:nowrap;';
              copyCmdBtn.textContent = '复制命令';
              copyCmdBtn.onclick = function() {
                navigator.clipboard.writeText(mp.execution_command);
                showToast('已复制运行命令', 'success');
              };
              cmdRow.appendChild(copyCmdBtn);
              box.appendChild(cmdRow);

              const codeTitle = document.createElement('div');
              codeTitle.style.cssText = 'font-size:12px;font-weight:600;color:#fff;margin-bottom:6px;';
              codeTitle.textContent = '源码预览 (' + escHtml(mp.python_script_filename || 'multi_proxy_downloader.py') + '):';
              box.appendChild(codeTitle);

              const pre = document.createElement('pre');
              pre.style.cssText = 'max-height:180px;overflow-y:auto;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:8px;font-size:11px;color:#86efac;font-family:monospace;white-space:pre-wrap;line-height:1.4;';
              pre.textContent = mp.python_script_content;
              box.appendChild(pre);

              paneB.appendChild(box);
            }
            tabContents.appendChild(paneB);

            // === Content C: Unified proxy env ===
            const paneC = document.createElement('div');
            paneC.id = 'tab-content-c';
            paneC.style.display = 'none';
            if (data.unified_proxy_env_wrapper) {
              const uenv = data.unified_proxy_env_wrapper;
              const box = document.createElement('div');
              box.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;';

              const hRow = document.createElement('div');
              hRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
              hRow.innerHTML = '<span style="font-weight:600;font-size:14px;color:#fff;">🌐 统一代理环境控制脚本 (' + escHtml(uenv.script_filename || 'proxy_env.sh') + ')</span>';

              const copyShBtn = document.createElement('button');
              copyShBtn.className = 'btn btn-secondary';
              copyShBtn.style.cssText = 'font-size:12px;padding:4px 10px;';
              copyShBtn.textContent = '📋 复制 proxy_env.sh';
              copyShBtn.onclick = function() {
                navigator.clipboard.writeText(uenv.script_content);
                showToast('已复制 proxy_env.sh 脚本内容', 'success');
              };
              hRow.appendChild(copyShBtn);
              box.appendChild(hRow);

              const sub = document.createElement('div');
              sub.style.cssText = 'font-size:12px;color:var(--text-dim);margin-bottom:10px;';
              sub.textContent = '提供 source proxy_env.sh proxy_on 与 proxy_off 一键接管 Shell/Git/Pip/Wget/Curl/HF 极速下载环境变量。';
              box.appendChild(sub);

              const pre = document.createElement('pre');
              pre.style.cssText = 'max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:8px;font-size:11px;color:#fcd34d;font-family:monospace;white-space:pre-wrap;line-height:1.5;';
              pre.textContent = uenv.script_content;
              box.appendChild(pre);

              paneC.appendChild(box);
            }
            tabContents.appendChild(paneC);

            // === Content D: Agent MCP Payload & Prompt ===
            const paneD = document.createElement('div');
            paneD.id = 'tab-content-d';
            paneD.style.display = 'none';

            const mcpPayloadObj = {
              target_server_id: sId,
              resource_url: urlVal
            };
            const mcpBox = document.createElement('div');
            mcpBox.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;';
            mcpBox.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
              + '<span style="font-weight:600;font-size:13px;color:#fff;">1. MCP 工具调用 Payload (plan_network_relay):</span>'
              + '<button class="btn btn-secondary" style="font-size:12px;padding:4px 8px;" id="copy-mcp-payload-btn">📋 复制 JSON</button>'
              + '</div>'
              + '<pre style="background:rgba(0,0,0,0.4);padding:10px;border-radius:6px;font-size:12px;color:#67e8f9;font-family:monospace;margin-bottom:14px;">' + escHtml(JSON.stringify(mcpPayloadObj, null, 2)) + '</pre>'
              + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
              + '<span style="font-weight:600;font-size:13px;color:#fff;">2. 自然语言 Agent 提示词 (Direct Prompt for LLM):</span>'
              + '<button class="btn btn-secondary" style="font-size:12px;padding:4px 8px;" id="copy-mcp-prompt-btn">📋 复制 Prompt</button>'
              + '</div>'
              + '<pre style="background:rgba(0,0,0,0.4);padding:10px;border-radius:6px;font-size:12px;color:#d8b4fe;font-family:monospace;white-space:pre-wrap;line-height:1.4;">'
              + '请为服务器 ' + sId + ' 规划并执行下载策略：<br>'
              + '1. 调用 plan_network_relay { target_server_id: "' + sId + '", resource_url: "' + urlVal + '" }<br>'
              + '2. 根据返回的策略执行竞速或多代理分片并发拉取<br>'
              + '3. 下载完成后立即调用 register_dataset 登记进系统集体记忆'
              + '</pre>';
            paneD.appendChild(mcpBox);
            tabContents.appendChild(paneD);

            resultBox.appendChild(tabContents);

            // Wire up paneD copy buttons
            setTimeout(function() {
              const b1 = document.getElementById('copy-mcp-payload-btn');
              if (b1) b1.onclick = function() {
                navigator.clipboard.writeText(JSON.stringify(mcpPayloadObj, null, 2));
                showToast('已复制 MCP Payload JSON', 'success');
              };
              const b2 = document.getElementById('copy-mcp-prompt-btn');
              if (b2) b2.onclick = function() {
                const pt = [
                  '请为服务器 ' + sId + ' 规划并执行下载策略：',
                  '1. 调用 plan_network_relay { target_server_id: "' + sId + '", resource_url: "' + urlVal + '" }',
                  '2. 根据返回的策略执行竞速或多代理分片并发拉取',
                  '3. 下载完成后立即调用 register_dataset 登记进系统集体记忆'
                ].join(String.fromCharCode(10));
                navigator.clipboard.writeText(pt);
                showToast('已复制 Agent 提示词', 'success');
              };
            }, 50);

            // Post step: register_dataset Callout
            const regBox = document.createElement('div');
            regBox.style.cssText = 'padding:12px 16px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:10px;font-size:13px;color:#86efac;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;';
            regBox.innerHTML = '<div><b>✔ 第 6 步必做：</b>' + escHtml(data.post_download_step || '下载完成后必须就地调用 register_dataset 登记进集群集体记忆') + '</div>';
            resultBox.appendChild(regBox);

          } else {
            showToast('生成方案失败', 'error');
          }
        } catch (e) {
          planBtn.disabled = false;
          planBtn.innerHTML = '<span>⚡ 重新生成调度方案</span>';
          showToast('网络错误: ' + e.message, 'error');
        }
      };

      const closeRow = document.createElement('div');
      closeRow.className = 'modal-actions';
      closeRow.style.marginTop = '24px';
      const cBtn = document.createElement('button');
      cBtn.className = 'btn btn-secondary';
      cBtn.textContent = '关闭';
      cBtn.onclick = closeModal;
      closeRow.appendChild(cBtn);
      modalContent.appendChild(closeRow);

      showModalWithElement(modalContent, '900px');
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
    function showModalWithElement(contentEl, customMaxWidth) {
      const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
      // overlay click does NOT close — only X or submit closes
      const modal = document.createElement('div'); modal.className = 'modal';
      if (customMaxWidth) {
        modal.style.maxWidth = customMaxWidth;
      }
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

    function getAiHeaders() {
      var headers = { 'Content-Type': 'application/json' };
      var nimKey = (localStorage.getItem('dsh_nim_api_key') || '').trim();
      var nimUrl = (localStorage.getItem('dsh_nim_api_url') || '').trim();
      var nimModel = (localStorage.getItem('dsh_nim_model_name') || '').trim();
      if (nimKey) headers['x-nim-api-key'] = nimKey;
      if (nimUrl) headers['x-nim-api-url'] = nimUrl;
      if (nimModel) headers['x-nim-model-name'] = nimModel;
      return headers;
    }

    function runAiExtract() {
      var text = document.getElementById('ai-text') ? document.getElementById('ai-text').value.trim() : '';
      var statusDiv = document.getElementById('ai-status');
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 正在通过 NIM 识别服务器信息...</span></div>';

      if (!text && pendingImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">请粘贴文本或上传图片后再提取</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingImages.length > 0) body.images = pendingImages;

      fetch('/api/ai/extract-server', {
        method: 'POST',
        headers: getAiHeaders(),
        body: JSON.stringify(body)
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          fillFormWithAI(result.data);
          statusDiv.innerHTML = '<p style="color:var(--green)">✅ AI 识别完成，已自动填充表单</p>';
        } else {
          var errMsg = result.error || 'AI 识别失败';
          if (errMsg.indexOf('not configured') !== -1 || errMsg.indexOf('未配置') !== -1) {
            statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + errMsg + ' <button class="btn-primary" onclick="openNimConfigModal()" style="font-size:11px;padding:3px 8px;margin-left:6px;">🔑 立即填入 NIM Key</button></p>';
          } else {
            statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + errMsg + '</p>';
          }
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
      var jumpEl = document.getElementById('add-is-jump-host');
      if (jumpEl && (d.is_jump_host || (d.notes && /跳板|bastion|jump/i.test(d.notes)))) {
        jumpEl.checked = true;
      }

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
        '  <div class="title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">' +
        '    <span>🤖 AI 智能导入 — 粘贴文本/截图或直接输入</span>' +
        '    <span onclick="openNimConfigModal()" style="cursor:pointer;font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-weight:600;">🔑 NIM Key 配置</span>' +
        '  </div>' +
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
        '<div style="margin:12px 0"><strong>连接方式与角色</strong></div>' +
        '<div class="form-group"><label>连接形式</label><select id="add-connection-type"><option value="standard">标准SSH（直连/代理）</option><option value="cloudflare_tunnel">Cloudflare隧道（cloudflared access ssh）</option></select></div>' +
        '<div id="conn-standard-toggles" class="toggle-group" style="display:flex;flex-wrap:wrap;gap:12px;">' +
        '  <label><input type="checkbox" id="add-v2ray"> 有V2RayN</label>' +
        '  <label><input type="checkbox" id="add-direct-proxy" checked> V2RayN时可直连</label>' +
        '  <label><input type="checkbox" id="add-direct-no-proxy"> 无代理时直连</label>' +
        '  <label style="color:#facc15;font-weight:600;"><input type="checkbox" id="add-is-jump-host"> 🔀 设为跳板机 (用于SSH穿透与状态探针)</label>' +
        '</div>' +
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
        is_jump_host: document.getElementById('add-is-jump-host') && document.getElementById('add-is-jump-host').checked ? 1 : 0,
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
        '  <div class="title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">' +
        '    <span>🤖 AI 智能导入 — 粘贴代理配置文本或截图</span>' +
        '    <span onclick="openNimConfigModal()" style="cursor:pointer;font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);font-weight:600;">🔑 NIM Key 配置</span>' +
        '  </div>' +
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
      statusDiv.innerHTML = '<div class="ai-loading"><div class="spinner"></div><span>AI 正在通过 NIM 识别代理信息...</span></div>';

      if (!text && pendingProxyImages.length === 0) {
        statusDiv.innerHTML = '<p style="color:var(--red)">请粘贴文本或上传图片后再提取</p>';
        return;
      }

      var body = {};
      if (text) body.text = text;
      if (pendingProxyImages.length > 0) body.images = pendingProxyImages;

      fetch('/api/ai/extract-proxy', {
        method: 'POST',
        headers: getAiHeaders(),
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
          var errMsg = result.error || '识别失败';
          if (errMsg.indexOf('not configured') !== -1 || errMsg.indexOf('未配置') !== -1) {
            statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + errMsg + ' <button class="btn-primary" onclick="openNimConfigModal()" style="font-size:11px;padding:3px 8px;margin-left:6px;">🔑 立即填入 NIM Key</button></p>';
          } else {
            statusDiv.innerHTML = '<p style="color:var(--red)">❌ ' + errMsg + '</p>';
          }
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

      const pitfallCount = (s.pitfalls && s.pitfalls.length) || s.pitfalls_count || 0;
      addRow('避坑沉淀', '<span style="color:#fbbf24;font-weight:600;">' + pitfallCount + ' 条记录</span> <button class="btn btn-secondary" style="padding:2px 8px;font-size:11px;margin-left:8px;" onclick="closeModal();showPitfallsModal(&quot;' + s.id + '&quot;)">查看/录入</button>');

      const actionsDiv = document.createElement('div'); actionsDiv.className = 'modal-actions';
      const pitBtn = document.createElement('button');
      pitBtn.className = 'btn btn-secondary';
      pitBtn.textContent = '⚠️ 查看/录入避坑指南 (' + pitfallCount + ')';
      pitBtn.onclick = function() { closeModal(); showPitfallsModal(s.id); };
      actionsDiv.appendChild(pitBtn);

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

    async function showPitfallsModal(id) {
      const s = servers.find(x => x.id === id);
      if (!s) return;
      showModal('<div class="ai-loading"><div class="spinner"></div><span>加载踩坑备忘录...</span></div>');
      
      try {
        const pitfallList = await API.pitfalls(id);
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'max-width:720px;display:flex;flex-direction:column;gap:16px;';

        // Header
        const header = document.createElement('div');
        header.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;">'
          + '<h2 style="margin:0;font-size:20px;color:#fff;display:flex;align-items:center;gap:8px;">⚠️ ' + escHtml(s.name) + ' 踩坑与避坑指南</h2>'
          + '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);font-weight:600;">' + pitfallList.length + ' 条经验</span>'
          + '</div>'
          + '<div style="font-size:13px;color:var(--text-dim);margin-top:6px;line-height:1.5;">沉淀此机器上的所有环境陷阱、驱动/库冲突、网络阻断及正确规避指令。调用 <code>get_servers</code> 时将随服务器信息自动返回给所有 Agent。</div>';
        modalContent.appendChild(header);

        // List Container
        const listContainer = document.createElement('div');
        listContainer.id = 'pitfallsListContainer';
        listContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;max-height:400px;overflow-y:auto;padding-right:4px;';

        function renderPitfallCards(items) {
          listContainer.innerHTML = '';
          if (items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'padding:28px 16px;border:1px dashed rgba(255,255,255,0.12);border-radius:12px;text-align:center;color:var(--text-dim);font-size:13px;background:rgba(255,255,255,0.01);';
            emptyDiv.innerHTML = '<div style="font-size:28px;margin-bottom:6px;">✨</div>'
              + '<div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:4px;">暂无踩坑记录</div>'
              + '<div>当前服务器暂未记录任何环境陷阱。若在调用或调试过程中发现环境问题，请在下方录入。</div>';
            listContainer.appendChild(emptyDiv);
            return;
          }

          items.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;position:relative;';

            // Top row
            const topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;';

            const titleLeft = document.createElement('div');
            titleLeft.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

            const titleSpan = document.createElement('span');
            titleSpan.style.cssText = 'font-weight:700;font-size:15px;color:#fff;';
            titleSpan.textContent = p.title;
            titleLeft.appendChild(titleSpan);

            // Severity Badge
            const sevBadge = document.createElement('span');
            sevBadge.style.cssText = 'padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;';
            const sev = (p.severity || 'warning').toLowerCase();
            if (sev === 'critical') {
              sevBadge.style.background = 'rgba(239,68,68,0.18)';
              sevBadge.style.color = '#f87171';
              sevBadge.style.border = '1px solid rgba(239,68,68,0.35)';
              sevBadge.textContent = '🔴 严重阻断';
            } else if (sev === 'info') {
              sevBadge.style.background = 'rgba(59,130,246,0.18)';
              sevBadge.style.color = '#60a5fa';
              sevBadge.style.border = '1px solid rgba(59,130,246,0.35)';
              sevBadge.textContent = '🔵 提示建议';
            } else {
              sevBadge.style.background = 'rgba(245,158,11,0.18)';
              sevBadge.style.color = '#fbbf24';
              sevBadge.style.border = '1px solid rgba(245,158,11,0.35)';
              sevBadge.textContent = '🟠 警告陷阱';
            }
            titleLeft.appendChild(sevBadge);

            if (p.agent) {
              const agSpan = document.createElement('span');
              agSpan.style.cssText = 'font-size:11px;color:var(--text-dim);';
              agSpan.textContent = 'by ' + p.agent;
              titleLeft.appendChild(agSpan);
            }

            topRow.appendChild(titleLeft);

            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'padding:2px 8px;font-size:11px;background:transparent;border:1px solid rgba(239,68,68,0.3);color:var(--red);border-radius:6px;cursor:pointer;';
            delBtn.innerHTML = '🗑️ 删除';
            delBtn.onclick = async () => {
              if (confirm('确定删除踩坑记录 [' + p.title + '] 吗？')) {
                await API.deletePitfall(p.id);
                showToast('已删除踩坑记录', 'success');
                const updated = await API.pitfalls(id);
                renderPitfallCards(updated);
                loadServers();
              }
            };
            topRow.appendChild(delBtn);
            card.appendChild(topRow);

            // Description / Phenomenon
            const descDiv = document.createElement('div');
            descDiv.style.cssText = 'font-size:13px;color:var(--text);line-height:1.5;background:rgba(0,0,0,0.2);padding:8px 12px;border-radius:8px;border-left:3px solid var(--border);white-space:pre-wrap;';
            descDiv.innerHTML = '<span style="color:var(--text-dim);font-weight:600;">⚠️ 踩坑现象: </span>' + escHtml(p.description);
            card.appendChild(descDiv);

            // Workaround / Solution
            const solDiv = document.createElement('div');
            solDiv.style.cssText = 'font-size:13px;color:#86efac;line-height:1.5;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.25);padding:10px 12px;border-radius:8px;display:flex;flex-direction:column;gap:6px;';
            
            const solHeader = document.createElement('div');
            solHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
            solHeader.innerHTML = '<span style="color:#4ade80;font-weight:700;font-size:12px;">💡 避坑方案 / 正确指令 (Workaround):</span>';
            
            const copySolBtn = document.createElement('button');
            copySolBtn.className = 'btn btn-secondary';
            copySolBtn.style.cssText = 'padding:2px 8px;font-size:11px;font-weight:600;border-radius:4px;';
            copySolBtn.textContent = '📋 复制方案';
            copySolBtn.onclick = () => {
              navigator.clipboard.writeText(p.workaround);
              showToast('已复制避坑方案指令', 'success');
            };
            solHeader.appendChild(copySolBtn);
            solDiv.appendChild(solHeader);

            const solContent = document.createElement('pre');
            solContent.style.cssText = 'margin:0;font-family:monospace;font-size:12px;color:#bbf7d0;white-space:pre-wrap;word-break:break-all;';
            solContent.textContent = p.workaround;
            solDiv.appendChild(solContent);

            card.appendChild(solDiv);
            listContainer.appendChild(card);
          });
        }

        renderPitfallCards(pitfallList);
        modalContent.appendChild(listContainer);

        // Add Pitfall Form Box
        const addBox = document.createElement('div');
        addBox.style.cssText = 'background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;margin-top:4px;';
        addBox.innerHTML = '<div style="font-weight:700;font-size:14px;color:#fff;display:flex;align-items:center;gap:6px;">➕ 录入新踩坑记录</div>'
          + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;">'
          + '<input id="new-pitfall-title" type="text" placeholder="踩坑标题/简述 (如: CUDA 12.1 兼容性问题)" style="padding:8px 10px;font-size:13px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);">'
          + '<select id="new-pitfall-sev" style="padding:8px 10px;font-size:13px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);"><option value="warning">🟠 警告陷阱</option><option value="critical">🔴 严重阻断</option><option value="info">🔵 提示建议</option></select>'
          + '</div>'
          + '<textarea id="new-pitfall-desc" rows="2" placeholder="踩坑详细现象 / 报错日志 / 触发条件..." style="width:100%;padding:8px 10px;font-size:12px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;resize:vertical;"></textarea>'
          + '<textarea id="new-pitfall-sol" rows="2" placeholder="避坑方案 / 正确操作指令 / 规避方法..." style="width:100%;padding:8px 10px;font-size:12px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:monospace;resize:vertical;"></textarea>'
          + '<div style="display:flex;justify-content:flex-end;">'
          + '<button id="submit-pitfall-btn" class="btn-primary" style="padding:8px 16px;font-size:13px;">💾 提交并同步至集体记忆</button>'
          + '</div>';

        const submitBtn = addBox.querySelector('#submit-pitfall-btn');
        if (submitBtn) {
          submitBtn.onclick = async () => {
            const title = (document.getElementById('new-pitfall-title').value || '').trim();
            const severity = document.getElementById('new-pitfall-sev').value;
            const description = (document.getElementById('new-pitfall-desc').value || '').trim();
            const workaround = (document.getElementById('new-pitfall-sol').value || '').trim();

            if (!title || !description || !workaround) {
              alert('请填写完整的标题、踩坑现象与避坑方案！');
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = '提交中...';
            try {
              const res = await API.createPitfall(id, {
                title,
                severity,
                description,
                workaround,
                agent: 'web-user',
              });
              if (res && res.success) {
                showToast('✔ 踩坑经验已成功入库并同步！', 'success');
                document.getElementById('new-pitfall-title').value = '';
                document.getElementById('new-pitfall-desc').value = '';
                document.getElementById('new-pitfall-sol').value = '';
                const updated = await API.pitfalls(id);
                renderPitfallCards(updated);
                loadServers();
              } else {
                alert('录入失败: ' + (res && res.error ? res.error : '未知错误'));
              }
            } catch (err) {
              alert('网络错误: ' + err.message);
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = '💾 提交并同步至集体记忆';
            }
          };
        }
        modalContent.appendChild(addBox);

        // Footer Actions
        const footer = document.createElement('div');
        footer.className = 'modal-actions';
        footer.style.cssText = 'margin-top:8px;';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = '关闭';
        closeBtn.onclick = closeModal;
        footer.appendChild(closeBtn);
        modalContent.appendChild(footer);

        showModalWithElement(modalContent);
      } catch (e) {
        showModal('<h2>❌ 加载失败</h2><p style="color:var(--red)">' + e.message + '</p><div class="modal-actions"><button class="btn-primary" onclick="closeModal()">关闭</button></div>');
      }
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
        var _isJump = s.is_jump_host === 1 || s.is_jump_host === true;
        var connDiv = document.createElement('div');
        connDiv.innerHTML = '<div style="margin:12px 0"><strong>连接方式与角色</strong></div>'+
          '<div class="form-group"><label>连接形式</label><select id="edit-connection-type" onchange="editToggleConnType()"><option value="standard"'+(_ct==='standard'?' selected':'')+'>标准SSH（直连/代理）</option><option value="cloudflare_tunnel"'+(_ct==='cloudflare_tunnel'?' selected':'')+'>Cloudflare隧道（cloudflared access ssh）</option></select></div>'+
          '<div id="edit-conn-standard-toggles" class="toggle-group" style="display:flex;flex-wrap:wrap;gap:12px;'+(_ct==='cloudflare_tunnel'?'display:none;':'')+'">'+
          '<label><input type="checkbox" id="edit-v2ray"'+(s.proxy?.v2ray_available||s.v2ray_available?' checked':'')+'> 有V2RayN</label>'+
          '<label><input type="checkbox" id="edit-direct-proxy"'+(s.proxy?.direct_when_proxy_available||s.direct_when_proxy_available?' checked':'')+'> V2RayN时可直连</label>'+
          '<label><input type="checkbox" id="edit-direct-no-proxy"'+(s.proxy?.direct_when_no_proxy||s.direct_when_no_proxy?' checked':'')+'> 无代理时直连</label>'+
          '<label style="color:#facc15;font-weight:600;"><input type="checkbox" id="edit-is-jump-host"'+(_isJump?' checked':'')+'> 🔀 设为跳板机 (用于SSH穿透与状态探针)</label>'+
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
        is_jump_host: document.getElementById('edit-is-jump-host') && document.getElementById('edit-is-jump-host').checked ? 1 : 0,
      };
      // Read key or password based on auth method
      var keyContentEl = document.getElementById('edit-key-content');
      var passwordEl = document.getElementById('edit-password');
      if (keyContentEl) updates.key_content = keyContentEl.value;
      if (passwordEl) updates.password = passwordEl.value;
      await API.updateServer(id, updates);
      closeModal(); loadServers();
    }
    /* =========================================================================
     * NVIDIA NIM / AI Key Configuration & Status Management
     * ========================================================================= */
    var serverNimEnvStatus = { has_env_key: false, masked_key: null, api_url: 'https://integrate.api.nvidia.com', model_name: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1' };

    async function checkNimStatusGlobal() {
      var badge = document.getElementById('nim-nav-badge');
      try {
        var r = await fetch('/api/ai/config-status');
        if (r.ok) {
          serverNimEnvStatus = await r.json();
        }
      } catch (e) {
        console.warn('Failed to check server NIM status', e);
      }

      var localKey = (safeGetStorage('dsh_nim_api_key') || '').trim();
      if (!badge) return;

      if (localKey) {
        var masked = localKey.length > 10 ? (localKey.slice(0, 6) + '...' + localKey.slice(-4)) : '已设';
        badge.innerHTML = '🟢 本地 Key (' + masked + ')';
        badge.style.background = 'rgba(16,185,129,0.25)';
        badge.style.color = '#6ee7b7';
      } else if (serverNimEnvStatus.has_env_key) {
        badge.innerHTML = '🟢 服务端 (' + (serverNimEnvStatus.masked_key || '已配置') + ')';
        badge.style.background = 'rgba(16,185,129,0.25)';
        badge.style.color = '#6ee7b7';
      } else {
        badge.innerHTML = '🟡 未配置 (点击填入)';
        badge.style.background = 'rgba(245,158,11,0.25)';
        badge.style.color = '#fcd34d';
      }
    }

    function openNimConfigModal() {
      var localKey = safeGetStorage('dsh_nim_api_key');
      var localUrl = safeGetStorage('dsh_nim_api_url') || serverNimEnvStatus.api_url || 'https://integrate.api.nvidia.com';
      var localModel = safeGetStorage('dsh_nim_model_name') || serverNimEnvStatus.model_name || 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1';

      var content = document.createElement('div');
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="font-size:24px;">🔑</div>' +
            '<div>' +
              '<h2 style="margin:0;font-size:18px;">NVIDIA NIM / AI 大模型配置中枢</h2>' +
              '<div style="font-size:12px;color:var(--text-dim);margin-top:2px;">配置专属 API Key 驱动 AI 智能识别、图片 OCR 与代理分析</div>' +
            '</div>' +
          '</div>' +
          '<span id="nim-modal-status-badge" style="font-size:12px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:var(--text-dim);">检测中...</span>' +
        '</div>' +
        '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;line-height:1.6;color:var(--text-dim);">' +
          '💡 <b>配置生效规则</b>：您在此输入的 <code>NVIDIA NIM Key (nvapi-...)</code> 将保存在当前浏览器，所有 AI 识别请求会优先携带；若留空则自动回退至 Worker 环境变量预设的 Key。' +
        '</div>' +
        '<div class="form-group">' +
          '<label style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span>🔑 NVIDIA NIM API Key (支持 nvapi-... / sk-...)</span>' +
            '<span style="font-size:11px;color:#60a5fa;cursor:pointer;" onclick="toggleNimKeyVisibility()">👁️ 切换明文/密文</span>' +
          '</label>' +
          '<div style="display:flex;gap:8px;">' +
            '<input id="nim-key-input" type="password" placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value="' + escHtml(localKey) + '" style="flex:1;font-family:monospace;letter-spacing:0.5px;">' +
            '<button class="btn-secondary" type="button" onclick="pasteNimKeyFromClipboard()" style="font-size:12px;white-space:nowrap;">📋 粘贴</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:12px;">' +
          '<label style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span>🌐 API 端点 URL (API URL)</span>' +
            '<span style="font-size:11px;color:var(--text-dim);">OpenAI 兼容端点</span>' +
          '</label>' +
          '<input id="nim-url-input" value="' + escHtml(localUrl) + '" placeholder="https://integrate.api.nvidia.com" style="font-family:monospace;">' +
          '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">' +
            '<span onclick="applyNimPreset(&quot;nim&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);cursor:pointer;">⚡ NVIDIA NIM 官方</span>' +
            '<span onclick="applyNimPreset(&quot;deepseek&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);cursor:pointer;">🐳 DeepSeek 官方</span>' +
            '<span onclick="applyNimPreset(&quot;openai&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);cursor:pointer;">🟢 OpenAI 官方</span>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:12px;">' +
          '<label style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span>🧠 默认大模型名称 (Model Name)</span>' +
            '<span style="font-size:11px;color:var(--text-dim);">多模态视觉推荐 Nemotron</span>' +
          '</label>' +
          '<input id="nim-model-input" value="' + escHtml(localModel) + '" placeholder="nvidia/llama-3.1-nemotron-nano-vl-8b-v1" style="font-family:monospace;">' +
          '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">' +
            '<span onclick="applyNimPreset(&quot;model-nano&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid var(--border);cursor:pointer;">🖼️ Nemotron Nano 8B (推荐图文识图)</span>' +
            '<span onclick="applyNimPreset(&quot;model-70b&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid var(--border);cursor:pointer;">🦙 Llama 3.1 70B</span>' +
            '<span onclick="applyNimPreset(&quot;model-r1&quot;)" style="font-size:11px;padding:3px 8px;border-radius:4px;background:rgba(255,255,255,0.06);color:var(--text);border:1px solid var(--border);cursor:pointer;">🧠 DeepSeek R1</span>' +
          '</div>' +
        '</div>' +
        '<div id="nim-test-result" style="margin-top:14px;"></div>' +
        '<div class="modal-actions" style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">' +
          '<button class="btn btn-secondary" type="button" onclick="testNimConnection()" id="nim-test-btn" style="display:flex;align-items:center;gap:6px;">⚡ 测试连通性</button>' +
          '<button class="btn btn-secondary" type="button" onclick="clearNimConfig()" style="color:var(--red);">🗑️ 清除本地</button>' +
          '<button class="btn-primary" type="button" onclick="saveNimConfig()">💾 保存并应用</button>' +
          '<button type="button" onclick="closeModal()">关闭</button>' +
        '</div>';

      showModalWithElement(content, '660px');
      refreshNimStatusInModal();
    }

    function applyNimPreset(type) {
      var urlInput = document.getElementById('nim-url-input');
      var modelInput = document.getElementById('nim-model-input');
      if (type === 'nim') {
        if (urlInput) urlInput.value = 'https://integrate.api.nvidia.com';
        if (modelInput) modelInput.value = 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1';
      } else if (type === 'deepseek') {
        if (urlInput) urlInput.value = 'https://api.deepseek.com';
        if (modelInput) modelInput.value = 'deepseek-chat';
      } else if (type === 'openai') {
        if (urlInput) urlInput.value = 'https://api.openai.com';
        if (modelInput) modelInput.value = 'gpt-4o';
      } else if (type === 'model-nano') {
        if (modelInput) modelInput.value = 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1';
      } else if (type === 'model-70b') {
        if (modelInput) modelInput.value = 'meta/llama-3.1-70b-instruct';
      } else if (type === 'model-r1') {
        if (modelInput) modelInput.value = 'deepseek-ai/deepseek-r1';
      }
    }

    function refreshNimStatusInModal() {
      var badge = document.getElementById('nim-modal-status-badge');
      if (!badge) return;
      var localKey = (safeGetStorage('dsh_nim_api_key') || '').trim();
      if (localKey) {
        badge.innerHTML = '🟢 本地自定义 Key (' + localKey.slice(0, 6) + '...' + localKey.slice(-4) + ')';
        badge.style.background = 'rgba(16,185,129,0.2)';
        badge.style.color = '#34d399';
      } else if (serverNimEnvStatus.has_env_key) {
        badge.innerHTML = '🟢 服务端预设 (' + (serverNimEnvStatus.masked_key || '有效') + ')';
        badge.style.background = 'rgba(16,185,129,0.2)';
        badge.style.color = '#34d399';
      } else {
        badge.innerHTML = '🟡 未设置 Key';
        badge.style.background = 'rgba(245,158,11,0.2)';
        badge.style.color = '#fbbf24';
      }
    }

    function toggleNimKeyVisibility() {
      var input = document.getElementById('nim-key-input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    }

    async function pasteNimKeyFromClipboard() {
      try {
        var text = await navigator.clipboard.readText();
        if (text) {
          var input = document.getElementById('nim-key-input');
          if (input) input.value = text.trim();
        }
      } catch (e) {
        showToast('无法访问剪贴板，请手动 Ctrl+V 粘贴', 'error');
      }
    }

    function setNimPreset(url, model) {
      var urlInput = document.getElementById('nim-url-input');
      var modelInput = document.getElementById('nim-model-input');
      if (urlInput) urlInput.value = url;
      if (modelInput) modelInput.value = model;
    }

    async function testNimConnection() {
      var key = (document.getElementById('nim-key-input')?.value || '').trim();
      var url = (document.getElementById('nim-url-input')?.value || '').trim();
      var model = (document.getElementById('nim-model-input')?.value || '').trim();
      var resDiv = document.getElementById('nim-test-result');
      var testBtn = document.getElementById('nim-test-btn');

      if (testBtn) testBtn.disabled = true;
      if (resDiv) {
        resDiv.innerHTML = '<div class="ai-loading" style="padding:12px;"><div class="spinner"></div><span>正在连接大模型端点并握手...</span></div>';
      }

      try {
        var r = await fetch('/api/ai/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: key, api_url: url, model_name: model })
        });
        var data = await r.json();
        if (r.ok && data.success) {
          resDiv.innerHTML = '<div style="padding:12px;border-radius:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:13px;line-height:1.6;">' +
            '<b>' + escHtml(data.message) + '</b><br>' +
            '<span style="font-size:12px;color:var(--text-dim);">响应延迟: <b>' + data.latency_ms + ' ms</b> | 来源: ' + escHtml(data.source) + ' | 响应: "' + escHtml(data.response_snippet) + '"</span>' +
          '</div>';
        } else {
          resDiv.innerHTML = '<div style="padding:12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:13px;line-height:1.6;">' +
            '<b>❌ 连接测试失败</b><br>' +
            '<span style="font-size:12px;">' + escHtml(data.error || '未知错误') + '</span>' +
          '</div>';
        }
      } catch (err) {
        resDiv.innerHTML = '<div style="padding:12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:13px;">' +
          '❌ 请求异常: ' + escHtml(err.message || String(err)) +
        '</div>';
      } finally {
        if (testBtn) testBtn.disabled = false;
      }
    }

    function saveNimConfig() {
      var key = (document.getElementById('nim-key-input')?.value || '').trim();
      var url = (document.getElementById('nim-url-input')?.value || '').trim();
      var model = (document.getElementById('nim-model-input')?.value || '').trim();

      if (key) {
        safeSetStorage('dsh_nim_api_key', key);
      } else {
        try { localStorage.removeItem('dsh_nim_api_key'); } catch(e){}
      }

      if (url) {
        safeSetStorage('dsh_nim_api_url', url);
      } else {
        try { localStorage.removeItem('dsh_nim_api_url'); } catch(e){}
      }

      if (model) {
        safeSetStorage('dsh_nim_model_name', model);
      } else {
        try { localStorage.removeItem('dsh_nim_model_name'); } catch(e){}
      }

      checkNimStatusGlobal();
      var resDiv = document.getElementById('nim-test-result');
      if (resDiv) {
        resDiv.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(16,185,129,0.15);color:#34d399;font-size:13px;text-align:center;">✅ 配置已保存至浏览器并在当前会话中即刻生效！</div>';
      }
      setTimeout(function() {
        closeModal();
      }, 900);
    }

    function clearNimConfig() {
      try {
        localStorage.removeItem('dsh_nim_api_key');
        localStorage.removeItem('dsh_nim_api_url');
        localStorage.removeItem('dsh_nim_model_name');
      } catch(e){}
      var keyInput = document.getElementById('nim-key-input');
      if (keyInput) keyInput.value = '';
      checkNimStatusGlobal();
      refreshNimStatusInModal();
      var resDiv = document.getElementById('nim-test-result');
      if (resDiv) {
        resDiv.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(245,158,11,0.15);color:#fbbf24;font-size:13px;text-align:center;">已清除本地自定义 Key，已回退为继承 Worker 环境变量。</div>';
      }
    }

    // === Google Drive Frontend Methods ===
    async function loadGdrive(folderId, keepBreadcrumb) {
      if (folderId !== undefined) {
        gdriveCurrentFolder = folderId;
      }
      if (!keepBreadcrumb && !folderId) {
        gdriveBreadcrumbs = [{ id: '', name: '根目录' }];
      }
      renderGdriveBreadcrumbs();

      var query = (document.getElementById('gdriveSearchInput')?.value || '').trim();
      var listTbody = document.getElementById('gdriveFileList');
      if (listTbody) {
        listTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#888"><div class="spinner" style="display:inline-block;vertical-align:middle;margin-right:8px"></div> 正在加载云盘数据...</td></tr>';
      }

      try {
        // 1. Status & Quota check
        var statusData = await API.gdriveStatus();
        renderGdriveQuota(statusData);

        if (!statusData.configured) {
          renderGdriveUnconfigured();
          return;
        }

        // 2. Fetch files
        var filesResp = await API.gdriveFiles(gdriveCurrentFolder, query);
        if (!filesResp.success) {
          if (listTbody) {
            listTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#f87171">❌ 获取文件列表失败: ' + escHtml(filesResp.error || '未知错误') + '</td></tr>';
          }
          return;
        }

        renderGdriveFiles(filesResp.files || []);
      } catch (err) {
        if (listTbody) {
          listTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#f87171">❌ 网络或服务请求异常: ' + escHtml(err.message || String(err)) + '</td></tr>';
        }
      }
    }

    function onGdriveSearchInput() {
      if (gdriveSearchTimer) clearTimeout(gdriveSearchTimer);
      gdriveSearchTimer = setTimeout(function() {
        loadGdrive(gdriveCurrentFolder, true);
      }, 300);
    }

    function renderGdriveQuota(status) {
      var subtitle = document.getElementById('gdriveAccountSubtitle');
      var quotaTitle = document.getElementById('gdriveQuotaTitle');
      var quotaDetail = document.getElementById('gdriveQuotaDetail');
      var quotaMetrics = document.getElementById('gdriveQuotaMetrics');

      if (!status || !status.configured) {
        if (subtitle) subtitle.innerHTML = 'Google Drive 服务账号未配置';
        if (quotaTitle) quotaTitle.innerHTML = '云盘未连接';
        if (quotaDetail) quotaDetail.innerHTML = '请配置 Google Service Account JSON 启用云端直连';
        if (quotaMetrics) {
          quotaMetrics.innerHTML = '<button class="btn btn-primary" onclick="openGdriveConfigModal()" style="font-size:12px;padding:6px 14px">立即配置凭据</button>';
        }
        return;
      }

      if (subtitle) {
        subtitle.innerHTML = '已连接服务账号: <code style="color:#aaa;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">' + escHtml(status.service_account_email || 'Service Account') + '</code>';
      }
      if (quotaTitle) quotaTitle.innerHTML = '🟢 实时连接正常';

      var q = status.quota || {};
      var usageGb = q.usage ? (parseInt(q.usage, 10) / (1024 * 1024 * 1024)).toFixed(2) : '0';
      var limitGb = q.limit ? (parseInt(q.limit, 10) / (1024 * 1024 * 1024)).toFixed(0) : '无限';
      if (quotaDetail) {
        quotaDetail.innerHTML = '已占用空间: <b>' + usageGb + ' GB</b>' + (limitGb !== '无限' ? ' / ' + limitGb + ' GB' : ' (无限容量/组织盘)');
      }

      if (quotaMetrics) {
        quotaMetrics.innerHTML =
          '<div style="text-align:right">' +
            '<div style="font-size:11px;color:#888">云盘归属</div>' +
            '<div style="font-size:13px;color:#fff;font-family:monospace">' + escHtml(q.userEmail || status.service_account_email || 'Google Drive') + '</div>' +
          '</div>';
      }
    }

    function renderGdriveUnconfigured() {
      var listTbody = document.getElementById('gdriveFileList');
      if (!listTbody) return;
      listTbody.innerHTML =
        '<tr><td colspan="4" style="padding:48px 24px;text-align:center;">' +
          '<div style="font-size:36px;margin-bottom:12px">☁️</div>' +
          '<div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:8px">尚未配置 Google Drive 访问凭据</div>' +
          '<div style="font-size:13px;color:#888;max-width:520px;margin:0 auto 20px;line-height:1.6">' +
            '为实现边缘端免登录实时检索实验产出、模型检查点（best.pt）和云端归档，请绑定一个 Google Cloud Service Account（服务账号）。' +
          '</div>' +
          '<button class="btn btn-primary" onclick="openGdriveConfigModal()" style="font-size:13px;padding:8px 20px">⚙️ 填写 Service Account JSON</button>' +
        '</td></tr>';
    }

    function renderGdriveBreadcrumbs() {
      var container = document.getElementById('gdriveBreadcrumbs');
      if (!container) return;

      var html = '';
      gdriveBreadcrumbs.forEach(function(b, idx) {
        var isLast = idx === gdriveBreadcrumbs.length - 1;
        if (idx > 0) {
          html += '<span style="color:#555">/</span>';
        }
        if (isLast) {
          html += '<span style="color:#fff;font-weight:500">' + escHtml(b.name) + '</span>';
        } else {
          html += '<span style="cursor:pointer;color:#888" class="gdrive-breadcrumb-item" onclick="navigateGdriveBreadcrumb(' + idx + ')">' + escHtml(b.name) + '</span>';
        }
      });
      container.innerHTML = html;
    }

    function openGdriveFolder(folderId, folderName) {
      gdriveBreadcrumbs.push({ id: folderId, name: folderName });
      loadGdrive(folderId, true);
    }

    function navigateGdriveBreadcrumb(idx) {
      gdriveBreadcrumbs = gdriveBreadcrumbs.slice(0, idx + 1);
      var target = gdriveBreadcrumbs[idx];
      loadGdrive(target.id, true);
    }

    function renderGdriveFiles(files) {
      var listTbody = document.getElementById('gdriveFileList');
      if (!listTbody) return;

      if (!files || files.length === 0) {
        listTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:48px;color:#888">📭 该目录下暂无文件或未匹配到搜索结果</td></tr>';
        return;
      }

      var html = '';
      files.forEach(function(f) {
        var isFolder = f.mimeType === 'application/vnd.google-apps.folder';
        var sizeBytes = f.size ? parseInt(f.size, 10) : null;
        var sizeFormatted = isFolder
          ? '<span style="color:#666">--</span>'
          : sizeBytes !== null
          ? (sizeBytes > 1024 * 1024 * 1024 ? (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB')
          : '<span style="color:#666">--</span>';

        var modTime = f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '--';
        var icon = isFolder ? '📁' : (f.name.endsWith('.pt') || f.name.endsWith('.pth') || f.name.endsWith('.bin') || f.name.endsWith('.safetensors') ? '⚖️' : (f.name.endsWith('.json') || f.name.endsWith('.yaml') || f.name.endsWith('.txt') || f.name.endsWith('.log') ? '📄' : '📦'));

        var escapedName = escHtml(f.name);
        var nameCell = isFolder
          ? '<div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openGdriveFolder(&quot;' + f.id + '&quot;, &quot;' + escapedName.replace(/"/g, '&quot;') + '&quot;)">' +
              '<span style="font-size:16px">' + icon + '</span>' +
              '<span style="color:#fff;font-weight:500;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2)">' + escapedName + '</span>' +
            '</div>'
          : '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:16px">' + icon + '</span>' +
              '<span style="color:#ddd;font-family:monospace;font-size:12.5px">' + escapedName + '</span>' +
            '</div>';

        var actionBtns = '';
        if (f.webViewLink) {
          actionBtns += '<a href="' + escHtml(f.webViewLink) + '" target="_blank" class="btn btn-secondary" style="font-size:11px;padding:4px 8px;text-decoration:none;display:inline-block">在 Drive 查看</a>';
        }
        actionBtns += ' <button class="btn btn-secondary" onclick="copyGdriveFileId(&quot;' + f.id + '&quot;)" style="font-size:11px;padding:4px 8px" title="复制 Google Drive File ID">复制 ID</button>';

        html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)" class="gdrive-table-row">' +
          '<td style="padding:10px 16px">' + nameCell + '</td>' +
          '<td style="padding:10px 16px;color:#aaa;font-size:12px;font-family:monospace">' + sizeFormatted + '</td>' +
          '<td style="padding:10px 16px;color:#888;font-size:12px">' + escHtml(modTime) + '</td>' +
          '<td style="padding:10px 16px;text-align:right">' + actionBtns + '</td>' +
        '</tr>';
      });

      listTbody.innerHTML = html;
    }

    function copyGdriveFileId(id) {
      navigator.clipboard.writeText(id).then(function() {
        alert('文件 ID 已复制到剪贴板: ' + id);
      });
    }

    function openGdriveConfigModal() {
      var content = document.createElement('div');
      content.style.padding = '8px 0';
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="font-size:22px;">⚙️</div>' +
            '<div>' +
              '<h2 style="margin:0;font-size:16px;font-weight:600;color:#fff">Google Drive 凭据配置</h2>' +
              '<div style="font-size:12px;color:#888;margin-top:2px">绑定 Google Cloud Service Account 实现边缘端免登实时浏览</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.6;color:#aaa">' +
          '💡 <b>配置指引</b>：<br>' +
          '1. 在 Google Cloud Console 创建一个 <b>Service Account</b> 并下载 JSON Key 文件。<br>' +
          '2. 在 Google Drive 中，将您的备份根文件夹（如 <code>server_backups</code>）<b>共享</b> 给该 Service Account 的 <code>client_email</code>。<br>' +
          '3. 将 JSON 文件内容完整粘贴在下方输入框中即可保存生效。' +
        '</div>' +
        '<div class="form-group">' +
          '<label style="font-size:12px;font-weight:500;color:#fff;margin-bottom:6px;display:block">🔑 Service Account JSON 密钥内容</label>' +
          '<textarea id="gdrive-sa-input" rows="8" placeholder="请在此处粘贴下载的 JSON 文件内容..." style="width:100%;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:6px;padding:10px;box-sizing:border-box"></textarea>' +
        '</div>' +
        '<div class="form-group">' +
          '<label style="font-size:12px;font-weight:500;color:#fff;margin-bottom:6px;display:block">📁 根文件夹 ID (可选，留空则默认全盘或已有配置)</label>' +
          '<input id="gdrive-folder-input" type="text" placeholder="例如: 1AbCdEfGhIjKlMnOpQrStUvWxYz..." style="width:100%;font-family:monospace;font-size:12px;box-sizing:border-box;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:6px;padding:8px 10px">' +
        '</div>' +
        '<div id="gdrive-save-result" style="margin-top:12px"></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">' +
          '<button class="btn btn-secondary" onclick="closeModal()" type="button">取消</button>' +
          '<button class="btn btn-primary" onclick="saveGdriveConfigSubmit()" id="gdrive-save-btn" type="button">保存并验证连接</button>' +
        '</div>';

      showModalWithElement(content, '560px');
    }

    async function saveGdriveConfigSubmit() {
      var saJson = (document.getElementById('gdrive-sa-input')?.value || '').trim();
      var folderId = (document.getElementById('gdrive-folder-input')?.value || '').trim();
      var saveBtn = document.getElementById('gdrive-save-btn');
      var resDiv = document.getElementById('gdrive-save-result');

      if (!saJson) {
        alert('请粘贴 Service Account JSON 内容！');
        return;
      }

      if (saveBtn) saveBtn.disabled = true;
      if (resDiv) {
        resDiv.innerHTML = '<div style="padding:10px;color:#888;font-size:12px">正在保存并验证 Google API 连通性...</div>';
      }

      try {
        var r = await API.saveGdriveConfig(saJson, folderId || undefined);
        if (r.success) {
          resDiv.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(16,185,129,0.15);color:#34d399;font-size:13px;text-align:center">✅ Google Drive 服务账号配置已成功保存！</div>';
          setTimeout(function() {
            closeModal();
            loadGdrive();
          }, 800);
        } else {
          resDiv.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(239,68,68,0.15);color:#f87171;font-size:13px">❌ ' + escHtml(r.error || '保存失败') + '</div>';
        }
      } catch (err) {
        if (resDiv) {
          resDiv.innerHTML = '<div style="padding:10px;border-radius:6px;background:rgba(239,68,68,0.15);color:#f87171;font-size:13px">❌ 请求异常: ' + escHtml(err.message || String(err)) + '</div>';
        }
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    }

    switchPage('servers');
    checkNimStatusGlobal();
    setInterval(()=>{if(currentPage==='servers')loadServers();},30000);
  </script>
</body>
</html>`;
