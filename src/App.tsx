/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Server, Send, Code, Cloud, RefreshCw, Activity, Clock } from 'lucide-react';

export default function App() {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string>('/api/hello');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [postData, setPostData] = useState<string>('{\n  "nama": "AI Developer"\n}');
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/webhook/logs');
        if (res.ok) {
          const data = await res.json();
          setWebhookLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch webhook logs:', err);
      } finally {
        timeoutId = setTimeout(fetchLogs, 2000);
      }
    };

    fetchLogs();

    return () => clearTimeout(timeoutId);
  }, []);

  const handleTestAPI = async () => {
    setLoading(true);
    try {
      const isPost = (endpoint === '/api/webhook' ? 'POST' : method) === 'POST';
      let parsedBody;
      
      if (isPost) {
        try {
          parsedBody = JSON.parse(postData);
        } catch (e: any) {
          setResponse(JSON.stringify({ error: "Format JSON pada payload tidak valid: " + e.message }, null, 2));
          setLoading(false);
          return;
        }
      }

      const options: RequestInit = {
        method: isPost ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint === '/api/webhook' && { 'x-webhook-signature': 'test-signature-123' })
        },
      };

      if (isPost) {
        options.body = JSON.stringify(parsedBody);
      }

      const res = await fetch(endpoint, options);
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setResponse(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setResponse(text);
      }
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            E
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium text-sm">Projects</span>
            <span className="text-slate-300">/</span>
            <h1 className="text-slate-900 font-semibold text-sm tracking-tight">cloudflare-pages-api</h1>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="hidden md:inline text-xs font-semibold text-slate-600 uppercase tracking-wider">Dev Server</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-[1400px] mx-auto overflow-y-auto">
        
        {/* Left Column */}
        <div className="md:col-span-5 flex flex-col gap-6">
          
          {/* Info Card replacing old Hero */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">About Template</h2>
            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">API Endpoint Generator</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Aplikasi ini dirancang sebagai contoh endpoint API. Di mode preview ini, ia menggunakan Express. Saat di-deploy ke Cloudflare Pages, folder <code className="text-indigo-600 font-mono text-xs bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">functions/</code> akan otomatis berjalan sebagai Serverless Functions.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Live Webhook URL Anda</label>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                  <code className="text-xs text-indigo-600 font-mono overflow-hidden truncate flex-1 select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : 'Loading...'}
                  </code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook`)}
                    className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">cURL untuk n8n (Import cURL)</label>
                <div className="bg-slate-900 rounded-xl p-4 flex flex-col relative group">
                  <code className="text-xs text-green-400 font-mono whitespace-pre overflow-x-auto pb-2">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'URL'}/api/webhook \\
-H "Content-Type: application/json" \\
-H "x-webhook-signature: test-dari-n8n" \\
-d '{
  "event": "test_webhook",
  "data": {
    "message": "Hello from n8n!",
    "status": "success"
  }
}'`}
                  </code>
                  <button 
                    onClick={() => {
                      const curl = `curl -X POST ${window.location.origin}/api/webhook \\\n-H "Content-Type: application/json" \\\n-H "x-webhook-signature: test-dari-n8n" \\\n-d '{\n  "event": "test_webhook",\n  "data": {\n    "message": "Hello from n8n!",\n    "status": "success"\n  }\n}'`;
                      navigator.clipboard.writeText(curl);
                    }}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Copy cURL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Endpoint Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Test Local Endpoint</h2>
            
            <div className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">Pilih Endpoint</label>
                <select 
                  value={endpoint} 
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-colors cursor-pointer appearance-none"
                >
                  <option value="/api/hello">/api/hello (Default API)</option>
                  <option value="/api/webhook">/api/webhook (Terima Webhook)</option>
                </select>
              </div>

              {endpoint === '/api/hello' ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Metode Request</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMethod('GET')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all border ${
                        method === 'GET' 
                          ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      GET
                    </button>
                    <button
                      onClick={() => setMethod('POST')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all border ${
                        method === 'POST' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      POST
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                   <p className="text-sm text-emerald-800">
                     <strong className="block text-emerald-900 mb-1">Mode Webhook</strong>
                     Webhook selalu menggunakan metode <strong>POST</strong>. Request ini akan dikirimkan otomatis dengan header "x-webhook-signature" simulasi.
                   </p>
                </div>
              )}

              {(method === 'POST' || endpoint === '/api/webhook') && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">JSON Body (Payload Webhook/POST)</label>
                  <textarea
                    value={postData}
                    onChange={(e) => setPostData(e.target.value)}
                    className="w-full h-32 p-4 font-mono text-sm bg-slate-50 border border-slate-100 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                    spellCheck="false"
                  />
                </div>
              )}

              <button
                onClick={handleTestAPI}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm mt-2 disabled:opacity-70"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="md:col-span-7 flex flex-col gap-6">
          
          {/* Response Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px] md:min-h-[400px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>JSON Response</span>
              </h2>
              {loading && (
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span className="text-xs text-slate-500">Memproses request...</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden relative rounded-b-2xl">
              {response ? (
                <pre className="p-6 text-sm font-mono text-slate-700 overflow-auto h-full w-full absolute inset-0 bg-slate-50/50">
                  {response}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50">
                  <Server className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Response akan tampil di sini</p>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Logs Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Recent Webhooks</span>
              </h2>
              <div className="flex items-center space-x-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-xs text-slate-500">Listening...</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-x-auto min-h-[200px]">
              {webhookLogs.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Data Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="text-sm group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                           {log.id === 'cf-pages-notice' ? (
                             <span className="text-amber-600 font-medium">NOTICE</span>
                           ) : (
                             <span className="text-slate-900 font-medium">200 OK</span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${log.id === 'cf-pages-notice' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {log.method}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1 text-slate-500 text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 text-[11px] md:text-xs">
                           <div className="max-w-xs md:max-w-md break-words whitespace-pre-wrap">
                             {log.id === 'cf-pages-notice' ? log.payload.notice : JSON.stringify(log.payload)}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <Activity className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Belum ada webhook yang diterima</p>
                  <p className="text-xs text-center max-w-xs">Kirim POST request ke <code className="text-indigo-500">/api/webhook</code> untuk melihat log di sini.</p>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Deployment Guide</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Platform</span>
                <span className="text-sm font-medium text-slate-900">Cloudflare Pages</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Step 1</span>
                <span className="text-sm font-medium text-slate-900 text-right">Export ke GitHub</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Step 2</span>
                <span className="text-sm font-medium text-slate-900 text-right">Connect Git ke Cloudflare Pages</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-500">Build Command</span>
                <code className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-xs font-mono text-indigo-600">npm run build</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Build Directory</span>
                <code className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-xs font-mono text-indigo-600">dist</code>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
