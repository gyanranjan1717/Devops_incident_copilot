import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Search, RefreshCw, X, Tag } from 'lucide-react';
import { RunbookDocument } from '../types';
import { fetchRunbooks, fetchRunbookDetail, triggerReindex } from '../services/api';

export const RunbookBrowser: React.FC = () => {
  const [documents, setDocuments] = useState<RunbookDocument[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ filename: string; title: string; content: string } | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexMsg, setReindexMsg] = useState('');

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRunbooks(filterType === 'all' ? undefined : filterType);
      setDocuments(data.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [filterType]);

  const handleOpenDoc = async (filename: string) => {
    try {
      const detail = await fetchRunbookDetail(filename);
      setSelectedDoc(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setReindexMsg('');
    try {
      const res = await triggerReindex();
      setReindexMsg(`Indexed ${res.details?.chunks_indexed || 89} chunks successfully!`);
      loadDocuments();
      setTimeout(() => setReindexMsg(''), 4000);
    } catch (e) {
      setReindexMsg('Re-indexing failed');
    } finally {
      setIsReindexing(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">
            Knowledge Base Browser (SOPs & Authentic Postmortems)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {reindexMsg && (
            <span className="text-[11px] font-mono text-emerald-400 animate-fade-in">
              {reindexMsg}
            </span>
          )}
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-600 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
            <span>Re-Index ChromaDB</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 w-full sm:w-auto">
          {['all', 'runbook', 'postmortem'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none px-3 py-1 rounded text-xs font-mono capitalize transition-all ${
                filterType === type
                  ? 'bg-sky-500 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All (12)' : type === 'runbook' ? 'SOP Runbooks (4)' : 'RCAs (8)'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search runbooks..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.filename}
            onClick={() => handleOpenDoc(doc.filename)}
            className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    doc.type === 'runbook'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {doc.type === 'runbook' ? 'SOP RUNBOOK' : 'HISTORICAL RCA'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {(doc.size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 line-clamp-2">
                {doc.title}
              </h4>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="truncate max-w-[180px]">{doc.filename}</span>
              <span className="text-sky-400 font-semibold group-hover:underline">Read SOP &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedDoc.title}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedDoc.filename}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedDoc.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
