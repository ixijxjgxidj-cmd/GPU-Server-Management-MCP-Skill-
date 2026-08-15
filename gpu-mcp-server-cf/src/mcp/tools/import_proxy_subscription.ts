import type { McpTool } from './index';
import { createProxySubscription, batchUpsertProxies, updateProxySubscription } from '../../db/queries';
import { parseSubscriptionContent } from '../../orchestration/subscription';

export const importProxySubscriptionTool: McpTool = {
  definition: {
    name: 'import_proxy_subscription',
    description: '导入并解析 Clash YAML 或 V2Ray Base64 代理订阅链接，批量将可用代理节点录入代理池并自动完成地区识别与分类。',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '订阅链接 URL (Clash 或 V2Ray 订阅链接)。' },
        name: { type: 'string', description: '订阅名称备注 (例如: "机场A-主订阅", "备用专线订阅")。' },
        raw_content: { type: 'string', description: '可选：如果订阅需要特殊本地凭据或已在本地获取，可直接传入订阅的 YAML 或 Base64 文本内容。' },
      },
      required: ['url'],
    },
  },
  execute: async (args, { db }) => {
    const url = args.url as string;
    const name = (args.name as string) || `订阅-${new Date().toISOString().slice(0, 10)}`;
    let content = args.raw_content as string | undefined;

    if (!content) {
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'ClashforWindows/0.20.39 clash-verge/v1.7.7 Mozilla/5.0',
            'Accept': '*/*',
          },
        });
        if (!resp.ok) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `无法获取订阅链接内容: HTTP ${resp.status} ${resp.statusText}` }) }],
            isError: true,
          };
        }
        content = await resp.text();
      } catch (e: any) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `请求订阅 URL 失败: ${e.message}` }) }],
          isError: true,
        };
      }
    }

    if (!content || !content.trim()) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: '订阅内容为空或无法解码' }) }],
        isError: true,
      };
    }

    const subId = await createProxySubscription(db, { name, url });
    const nodes = parseSubscriptionContent(content, subId);

    if (nodes.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            warning: '未在订阅内容中解析到有效节点。请检查订阅链接格式是否为标准 Clash YAML 或 Base64 节点列表。',
            subscription_id: subId,
            imported_count: 0,
          }),
        }],
      };
    }

    const importedCount = await batchUpsertProxies(db, nodes);
    await updateProxySubscription(db, subId, {
      node_count: importedCount,
      last_synced_at: new Date().toISOString(),
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          subscription_id: subId,
          subscription_name: name,
          node_count: importedCount,
          sample_nodes: nodes.slice(0, 5).map(n => ({ name: n.name, host: n.host, port: n.port, protocol: n.protocol, region: n.region })),
          message: `✔ 成功导入订阅 [${name}]，已批量添加/更新 ${importedCount} 个代理节点至代理池！`,
        }),
      }],
    };
  },
};
