/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Server, Send, Code, Cloud, RefreshCw, Activity, Clock, Database, CheckCircle2, MessageSquare, Terminal, Settings, Menu, Search } from 'lucide-react';

export default function App() {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [endpoint, setEndpoint] = useState<string>('/api/hello');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const defaultWhatsAppPayload = `{
  "status": "success",
  "received_payload": [
    {
      "messaging_product": "whatsapp",
      "contacts": [
        {
          "profile": { "name": "Ridwan Tassa" },
          "wa_id": "6282255553833"
        }
      ],
      "messages": [
        {
          "from": "6282255553833",
          "timestamp": "${Math.floor(Date.now() / 1000)}",
          "text": { "body": "Haloo, ini contoh pesan webhook baru" },
          "type": "text"
        }
      ]
    }
  ]
}`;
  const [postData, setPostData] = useState<string>(defaultWhatsAppPayload);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isSavingSheet, setIsSavingSheet] = useState<boolean>(false);
  const [sheetSaved, setSheetSaved] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'webhook' | 'setup'>('inbox');
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readAt, setReadAt] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  useEffect(() => {
    // Fetch initial settings for sheet url
    fetch('/api/settings/google-sheets')
      .then(res => res.json())
      .then(data => {
        if (data.url) setSheetUrl(data.url);
      })
      .catch(() => {});
  }, []);

  const latestReadRef = useRef<Record<string, number>>({});

  const mergedReadAt = useMemo(() => {
     const readDict: Record<string, number> = {};
     webhookLogs.forEach(log => {
        let payloadArr = log.payload;
        if (!Array.isArray(payloadArr)) {
          if (payloadArr && payloadArr.received_payload) payloadArr = payloadArr.received_payload;
          else payloadArr = [payloadArr];
        }
        if (!Array.isArray(payloadArr)) payloadArr = [payloadArr];

        payloadArr.forEach((entry: any) => {
           if (entry && entry.event === 'mark_read' && entry.data) {
               const sn = entry.data.senderNumber;
               const ts = entry.data.timestamp;
               if (sn && ts) {
                  if (!readDict[sn] || ts > readDict[sn]) {
                      readDict[sn] = ts;
                  }
               }
           }
        });
     });
     return { ...readDict, ...readAt };
  }, [webhookLogs, readAt]);

  useEffect(() => {
    latestReadRef.current = mergedReadAt;
  }, [mergedReadAt]);

  const visibleWebhookLogs = useMemo(() => {
    return webhookLogs.filter(log => {
      if (log.id === 'error' || log.id === 'cf-pages-notice') return true;
      let pArr = log.payload;
      if (!Array.isArray(pArr)) {
         if (pArr && pArr.received_payload) pArr = pArr.received_payload;
         else pArr = [pArr];
      }
      if (!Array.isArray(pArr)) return true;
      return !pArr.some((p: any) => p && p.event === 'mark_read');
    });
  }, [webhookLogs]);

  const chatMessages = useMemo(() => {
    const messages: any[] = [];
    webhookLogs.forEach(log => {
      if (log.id === 'error' || log.id === 'cf-pages-notice') return;

      let payloadArr = log.payload;
      
      if (!Array.isArray(payloadArr)) {
        if (payloadArr && payloadArr.received_payload) {
             payloadArr = payloadArr.received_payload;
        } else {
             payloadArr = [payloadArr];
        }
      }
      
      if (!Array.isArray(payloadArr)) {
         payloadArr = [payloadArr];
      }

      payloadArr.forEach(entry => {
         if (entry && entry.messaging_product === 'whatsapp' && entry.messages) {
            const contact = entry.contacts && entry.contacts[0] ? entry.contacts[0] : null;
            const senderName = contact?.profile?.name || contact?.wa_id || 'Unknown';
            const senderNumber = contact?.wa_id || '';
            
            entry.messages.forEach((msg: any) => {
                if (msg.type === 'text') {
                    messages.push({
                       id: msg.id || log.id + Math.random().toString(),
                       timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000) : new Date(log.timestamp),
                       senderName,
                       senderNumber,
                       body: msg.text?.body || '',
                       raw: log
                    });
                }
            });
         }
      });
    });
    
    // Sort ascending (oldest to newest)
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [webhookLogs]);

  const contacts = useMemo(() => {
    const map = new Map<string, { senderName: string, senderNumber: string, lastMessage: string, lastTimestamp: Date, unreadCount: number }>();
    chatMessages.forEach(msg => {
       const existing = map.get(msg.senderNumber);
       
       let isUnread = 0;
       if (msg.senderNumber !== activeContact) {
           const lastRead = mergedReadAt[msg.senderNumber] || 0;
           if (msg.timestamp.getTime() > lastRead) {
               isUnread = 1;
           }
       }

       if (!existing) {
          map.set(msg.senderNumber, {
             senderName: msg.senderName,
             senderNumber: msg.senderNumber,
             lastMessage: msg.body,
             lastTimestamp: msg.timestamp,
             unreadCount: isUnread
          });
       } else {
          existing.unreadCount += isUnread;
          if (msg.timestamp > existing.lastTimestamp) {
             existing.lastMessage = msg.body;
             existing.lastTimestamp = msg.timestamp;
          }
       }
    });
    return Array.from(map.values()).sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());
  }, [chatMessages, activeContact, mergedReadAt]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    
    return contacts.filter(c => {
      if (c.senderName.toLowerCase().includes(query)) return true;
      if (c.senderNumber.includes(query)) return true;
      // check if any messages match
      const hasMatchingMsg = chatMessages.some(msg => 
         msg.senderNumber === c.senderNumber && msg.body.toLowerCase().includes(query)
      );
      return hasMatchingMsg;
    });
  }, [contacts, searchQuery, chatMessages]);

  useEffect(() => {
     if (activeContact) {
        const contactMsgs = chatMessages.filter(m => m.senderNumber === activeContact);
        if (contactMsgs.length > 0) {
           const latestMsgTs = contactMsgs[contactMsgs.length - 1].timestamp.getTime();
           const currentReadTs = latestReadRef.current[activeContact] || 0;
           
           if (latestMsgTs > currentReadTs) {
              const newTs = Date.now();
              setReadAt(prev => ({ ...prev, [activeContact]: newTs }));
              latestReadRef.current[activeContact] = newTs;
              
              fetch('/api/webhook', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-webhook-signature': 'internal-read-receipt'
                },
                body: JSON.stringify({
                  event: "mark_read",
                  data: {
                    senderNumber: activeContact,
                    timestamp: newTs
                  }
                })
              }).catch(console.error);
           }
        }
     }
  }, [activeContact, chatMessages]);

  useEffect(() => {
     if (contacts.length > 0 && !activeContact) {
        setActiveContact(contacts[0].senderNumber);
     }
  }, [contacts, activeContact]);

  const activeMessages = useMemo(() => {
     if (!activeContact) return [];
     return chatMessages.filter(msg => msg.senderNumber === activeContact);
  }, [chatMessages, activeContact]);

  const prevActiveContact = useRef(activeContact);
  const prevMessageCount = useRef(activeMessages.length);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeContact) return;

    setSendingReply(true);
    try {
      const payload = {
        to: activeContact,
        text: replyText
      };
      
      const response = await fetch('https://n8n-wexrffsqeapb.sate.sumopod.my.id/webhook-test/terima-pengiriman-pesan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setReplyText('');
      } else {
        console.error("Failed to send message: HTTP", response.status);
      }
      
    } catch (error) {
       console.error("Failed to send message", error);
    } finally {
      setSendingReply(false);
    }
  };

  const renderMessageBody = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? 
            <mark key={i} className="bg-emerald-200 text-slate-900 rounded-sm px-0.5">{part}</mark> : 
            part
        )}
      </>
    );
  };

  useEffect(() => {
    if (activeContact !== prevActiveContact.current || activeMessages.length !== prevMessageCount.current) {
      scrollToBottom();
      prevActiveContact.current = activeContact;
      prevMessageCount.current = activeMessages.length;
    }
  }, [activeMessages.length, activeContact]);

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

  const handleSaveSheetUrl = async () => {
    setIsSavingSheet(true);
    setSheetSaved(false);
    try {
      await fetch('/api/settings/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl }),
      });
      setSheetSaved(true);
      setTimeout(() => setSheetSaved(false), 3000);
    } catch (error) {
      console.error("Gagal save url", error);
    } finally {
      setIsSavingSheet(false);
    }
  };

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
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
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

      <main className="flex-1 w-full max-w-[1400px] mx-auto overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Tabs */}
        {isSidebarOpen && (
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4 flex flex-col space-y-2 flex-shrink-0">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Menu Utama</div>
            <button 
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${activeTab === 'inbox' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat Inbox</span>
            </button>
            <button 
              onClick={() => setActiveTab('webhook')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${activeTab === 'webhook' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Terminal className="w-5 h-5" />
              <span>Webhook Logs</span>
            </button>
            <button 
              onClick={() => setActiveTab('setup')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${activeTab === 'setup' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="w-5 h-5" />
              <span>Setup & Testing</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 bg-slate-50 overflow-y-auto p-4 md:p-8 flex flex-col">
           {activeTab === 'inbox' && (
             <div className="flex-1 min-h-0 flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
               
               {/* Contacts Sidebar */}
               <div className="w-1/3 md:w-80 border-r border-slate-200 flex flex-col bg-slate-50 z-20 shrink-0">
                 <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between shadow-sm shrink-0">
                   <h2 className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                     <MessageSquare className="w-5 h-5 text-emerald-600" />
                     <span>Chats</span>
                   </h2>
                   <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Live</span>
                   </div>
                 </div>

                 {/* Search Bar */}
                 <div className="p-3 border-b border-slate-200 bg-white shadow-sm shrink-0">
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search className="h-4 w-4 text-slate-400" />
                     </div>
                     <input
                       type="text"
                       placeholder="Search chats or messages..."
                       className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                     />
                   </div>
                 </div>

                 <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                         <div 
                           key={contact.senderNumber} 
                           onClick={() => setActiveContact(contact.senderNumber)}
                           className={`p-4 cursor-pointer hover:bg-slate-100 transition-colors flex items-start space-x-3 ${activeContact === contact.senderNumber ? 'bg-slate-200/60' : 'bg-transparent'}`}
                         >
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0 text-lg uppercase shadow-sm">
                               {contact.senderName ? contact.senderName.charAt(0) : '#'}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="text-sm font-bold text-slate-800 truncate pr-2">{contact.senderName}</h3>
                                  <span className={`text-[10px] flex-shrink-0 ${contact.unreadCount > 0 ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}>
                                    {contact.lastTimestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                               </div>
                               <div className="flex justify-between items-start">
                                 <p className="text-[13px] text-slate-500 truncate flex-1 pr-2">{contact.lastMessage}</p>
                                 {contact.unreadCount > 0 && (
                                   <div className="bg-emerald-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0">
                                     {contact.unreadCount}
                                   </div>
                                 )}
                               </div>
                            </div>
                         </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-sm">
                         Belum ada chat masuk
                      </div>
                    )}
                 </div>
               </div>

               {/* Chat Panel */}
               <div className="flex-1 flex flex-col bg-[#efeae2] relative h-full overflow-hidden">
                 <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                 
                 {activeContact ? (
                   <>
                     <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center shadow-sm z-10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 shadow-sm">
                           {contacts.find(c => c.senderNumber === activeContact)?.senderName?.charAt(0) || '#'}
                        </div>
                        <div>
                           <h2 className="text-sm font-bold text-slate-800">{contacts.find(c => c.senderNumber === activeContact)?.senderName}</h2>
                           <p className="text-[11px] font-mono text-slate-500">+{activeContact}</p>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col space-y-4 z-10">
                        {activeMessages.map((msg, idx) => {
                          const isSameSenderAsPrevious = idx > 0 && activeMessages[idx - 1].senderNumber === msg.senderNumber;
                          return (
                            <div key={msg.id} className={`bg-white p-3 shadow-sm border border-slate-100 max-w-[85%] md:max-w-[70%] self-start flex flex-col relative ${isSameSenderAsPrevious ? 'rounded-2xl rounded-tl-sm mt-1' : 'rounded-2xl rounded-tl-sm mt-4'}`}>
                              <p className="text-slate-800 leading-relaxed text-[14px] md:text-[15px] whitespace-pre-wrap">{renderMessageBody(msg.body, searchQuery)}</p>
                              <div className="text-[10px] text-slate-400 text-right mt-1 flex justify-end items-center space-x-1 self-end min-w-[50px]">
                                <span>{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                     </div>
                     <div className="p-3 bg-white border-t border-slate-200 z-10 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                           <textarea
                             className="flex-1 max-h-32 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none scrollbar-thin overflow-y-auto"
                             placeholder="Ketik balasan..."
                             rows={1}
                             value={replyText}
                             onChange={(e) => setReplyText(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && !e.shiftKey) {
                                 e.preventDefault();
                                 handleSendMessage(e as any);
                               }
                             }}
                           />
                           <button
                             type="submit"
                             disabled={!replyText.trim() || sendingReply}
                             className="h-[44px] w-[44px] flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 text-white rounded-xl flex-shrink-0 transition-colors cursor-pointer"
                           >
                             {sendingReply ? (
                               <RefreshCw className="w-5 h-5 animate-spin" />
                             ) : (
                               <Send className="w-5 h-5 ml-0.5" />
                             )}
                           </button>
                        </form>
                     </div>
                   </>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 m-auto bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 z-10 relative h-[fit-content] max-h-48 mt-[20%]">
                      <MessageSquare className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">Buka chat untuk melihat pesan</p>
                    </div>
                 )}
               </div>
             </div>
           )}

           {activeTab === 'webhook' && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl shrink-0">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>Recent Webhooks Log</span>
                </h2>
                <div className="flex items-center space-x-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-xs text-slate-500">Listening...</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                {visibleWebhookLogs.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 hidden md:table-header-group">
                      <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4 border-b border-slate-200">Status</th>
                        <th className="px-6 py-4 border-b border-slate-200">Time</th>
                        <th className="px-6 py-4 border-b border-slate-200">Data Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 flex-1">
                      {visibleWebhookLogs.map((log) => (
                        <tr key={log.id} className="text-sm group hover:bg-slate-50/50 transition-colors flex flex-col md:table-row">
                          <td className="px-6 py-3 md:py-4 flex justify-between md:table-cell border-b border-slate-100 md:border-b-0">
                             <div className="flex items-center space-x-2">
                               {log.id === 'cf-pages-notice' ? (
                                 <span className="text-amber-600 font-medium whitespace-nowrap">NOTICE</span>
                               ) : (
                                 <span className="text-slate-900 font-medium whitespace-nowrap">200 OK</span>
                               )}
                               <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${log.id === 'cf-pages-notice' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                 {log.method}
                               </span>
                             </div>
                          </td>
                          <td className="px-6 py-3 md:py-4 flex justify-between md:table-cell border-b border-slate-100 md:border-b-0">
                            <div className="flex items-center space-x-1 text-slate-500 text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 text-[11px] md:text-xs">
                             <div className="max-w-full break-words whitespace-pre-wrap overflow-x-auto bg-slate-900 text-green-400 p-3 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin">
                               {log.id === 'cf-pages-notice' ? log.payload.notice : JSON.stringify(log.payload, null, 2)}
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
                    <p className="text-xs text-center max-w-xs">Tunggu request webhook dari n8n.</p>
                  </div>
                )}
              </div>
             </div>
           )}

           {activeTab === 'setup' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
               <div className="flex flex-col gap-6">
                 {/* Google Sheet Setup */}
                 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                     <Database className="w-4 h-4" />
                     <span>Database (Google Sheets)</span>
                   </h2>
                   <div className="space-y-4">
                     <p className="text-sm text-slate-500 leading-relaxed">
                       Simpan log webhook gratis menggunakan Google Apps Script. 
                     </p>
                     
                     <div className="space-y-2 mt-4">
                       <label className="text-xs font-medium text-slate-500">Google Apps Script Web App URL</label>
                       <div className="flex items-center space-x-2">
                         <input
                           type="url"
                           value={sheetUrl}
                           onChange={(e) => setSheetUrl(e.target.value)}
                           placeholder="https://script.google.com/macros/s/..."
                           className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                         />
                         <button 
                           onClick={handleSaveSheetUrl}
                           className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors flex items-center space-x-2 shadow-sm"
                         >
                           {isSavingSheet ? <RefreshCw className="w-4 h-4 animate-spin"/> : sheetSaved ? <CheckCircle2 className="w-4 h-4"/> : <span>Save</span>}
                         </button>
                       </div>
                       <p className="text-[11px] text-slate-500 mt-2">Ubah script di Google Apps Script dan deploy ulang (Me, Anyone) jika ada perubahan.</p>
                     </div>
                   </div>
                 </div>

                 {/* Webhook Info */}
                 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Webhook Info</h2>
                   <div className="space-y-4">
                     <div>
                       <label className="text-xs font-medium text-slate-500 block mb-2">Endpoint Webhook Anda</label>
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
                     <p className="text-xs text-slate-500">Masukkan URL ini ke node Webhook di n8n atau di setting provider WhatsApp Anda.</p>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col gap-6">
                 {/* Test API Panel */}
                 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                   <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                     <span>Test Webhook Payload</span>
                     {loading && <RefreshCw className="w-3 h-3 animate-spin"/>}
                   </h2>
                   
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <label className="text-xs font-medium text-slate-500">Kirim payload WhatsApp simulasi</label>
                       <textarea
                         value={postData}
                         onChange={(e) => setPostData(e.target.value)}
                         className="w-full h-40 p-4 font-mono text-[11px] md:text-xs bg-slate-900 border border-slate-800 text-green-400 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                         spellCheck="false"
                       />
                     </div>
                     <button
                       onClick={() => { setEndpoint('/api/webhook'); setMethod('POST'); handleTestAPI(); }}
                       disabled={loading}
                       className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                     >
                       <Send className="w-4 h-4" />
                       <span>Kirim Simulasi Webhook</span>
                     </button>
                     
                     {response && (
                       <div className="mt-4 border-t border-slate-100 pt-4">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Response</label>
                         <pre className="p-4 text-[10px] md:text-[11px] font-mono text-slate-600 bg-slate-50 rounded-xl overflow-x-auto">
                           {response}
                         </pre>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
