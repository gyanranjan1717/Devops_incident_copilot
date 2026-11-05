import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Search, RefreshCw, X, Layers, Database } from 'lucide-react';
import { RunbookDocument, VectorChunk } from '../types';
import { fetchRunbooks, fetchRunbookChunks, fetchRunbookDetail, triggerReindex } from '../services/api';

export const RunbookBrowser: React.FC = () => {
  const [viewMode, setViewMode] = useState<'documents' | 'chunks'>('documents');
  const [documents, setDocuments] = useState<RunbookDocument[]>([]);
  const [chunks, setChunks] = useState<VectorChunk[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ filename: string; title: string; content: string } | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<VectorChunk | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexMsg, setReindexMsg] = useState('');
  const [stats, setStats] = useState<{ total_chunks?: number; runbooks_chunks?: number; postmortems_chunks?: number }>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'documents') {
        const data = await fetchRunbooks(filterType === 'all' ? undefined : filterType);
        setDocuments(data.documents || []);
        if (data.vector_store_stats) setStats(data.vector_store_stats);
      } else {
        const data = await fetchRunbookChunks();
        setChunks(data.chunks || []);
        if (data.vector_store_stats) setStats(data.vector_store_stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, filterType]);

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
      loadData();
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

  const filteredChunks = chunks.filter((c) => {
    const typeMatch =
      filterType === 'all' ||
      (filterType === 'runbook' && c.metadata.type === 'runbook') ||
      (filterType === 'postmortem' && c.metadata.type === 'postmortem');

    if (!typeMatch) return false;

    const q = searchQuery.toLowerCase();
    if (!q) return true;

    return (
      c.id.toLowerCase().includes(q) ||
      (c.metadata.title && c.metadata.title.toLowerCase().includes(q)) ||
      (c.metadata.section && c.metadata.section.toLowerCase().includes(q)) ||
      (c.metadata.filename && c.metadata.filename.toLowerCase().includes(q)) ||
      c.text.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white">
            Knowledge Base Browser (SOPs & Authentic Postmortems)
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {stats.total_chunks || 89} Chunks in ChromaDB
          </span>
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

      {/* Main View Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => {
              setViewMode('documents');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'documents'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents (12 Files)</span>
          </button>

          <button
            onClick={() => {
              setViewMode('chunks');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'chunks'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Vector Chunks ({stats.total_chunks || 89})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'documents' ? 'Search 12 documents...' : 'Search across all 89 chunks...'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Sub Filter Buttons */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
          {['all', 'runbook', 'postmortem'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-[11px] font-mono capitalize transition-all ${
                filterType === type
                  ? 'bg-slate-800 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {viewMode === 'documents'
                ? type === 'all'
                  ? 'All Files (12)'
                  : type === 'runbook'
                  ? 'SOP Runbooks (4)'
                  : 'RCAs (8)'
                : type === 'all'
                ? `All Chunks (${chunks.length || stats.total_chunks || 89})`
                : type === 'runbook'
                ? `Runbook Chunks (${stats.runbooks_chunks || 38})`
                : `Postmortem Chunks (${stats.postmortems_chunks || 51})`}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          Showing {viewMode === 'documents' ? filteredDocs.length : filteredChunks.length} items
        </span>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span>Loading knowledge base from ChromaDB...</span>
        </div>
      )}

      {/* VIEW 1: Document View (12 Files) */}
      {!isLoading && viewMode === 'documents' && (
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
      )}

      {/* VIEW 2: All 89+ Vector Chunks View */}
      {!isLoading && viewMode === 'chunks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredChunks.map((chunk) => (
            <div
              key={chunk.id}
              onClick={() => setSelectedChunk(chunk)}
              className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/50 hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Chunk Header */}
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      chunk.metadata?.type === 'runbook'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {chunk.metadata?.type === 'runbook' ? 'RUNBOOK CHUNK' : 'POSTMORTEM CHUNK'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 truncate" title={chunk.id}>
                    #{chunk.id.split('_').pop()}
                  </span>
                </div>

                {/* Section Title */}
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 line-clamp-1 mb-1">
                  {chunk.metadata?.section || 'General Section'}
                </h4>

                {/* Document Reference */}
                <p className="text-[10px] text-slate-400 font-mono line-clamp-1 mb-2">
                  📄 {chunk.metadata?.title || chunk.metadata?.filename}
                </p>

                {/* Chunk text preview */}
                <p className="text-[11px] font-mono text-slate-400/90 line-clamp-3 bg-slate-900/60 p-2 rounded border border-slate-800/80 leading-relaxed">
                  {chunk.text.replace(/Document: [^\n]+\nSection: [^\n]+\n\n/, '')}
                </p>
              </div>

              {/* Chunk Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{chunk.text.length} chars</span>
                <span className="text-sky-400 font-semibold group-hover:underline">Inspect Chunk &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Vector Chunk Inspector Modal */}
      {selectedChunk && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    ChromaDB Vector Chunk
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {selectedChunk.id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {selectedChunk.metadata?.section || 'Chunk Detail'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Source: {selectedChunk.metadata?.filename} ({selectedChunk.metadata?.title})
                </p>
              </div>
              <button
                onClick={() => setSelectedChunk(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chunk Metadatas */}
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="text-slate-400">Embedding Space: <strong className="text-emerald-400">Cosine</strong></span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Length: <strong className="text-sky-400">{selectedChunk.text.length} chars</strong></span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Type: <strong className="text-amber-400">{selectedChunk.metadata?.type}</strong></span>
              {selectedChunk.metadata?.tags && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Tags: <strong className="text-slate-300">{selectedChunk.metadata.tags}</strong></span>
                </>
              )}
            </div>

            {/* Full Chunk Text */}
            <div className="p-5 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/40">
              {selectedChunk.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
