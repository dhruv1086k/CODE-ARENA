import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../api/client';

const NOTE_TAGS = ['DSA', 'Backend', 'Bugs', 'Ideas', 'Interview Prep'];
const AUTOSAVE_MS = 1500;

function countWords(text) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function formatEditedAt(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function NotesSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-3 animate-pulse min-h-[180px]">
      <div className="h-3 bg-[#1f2937] rounded w-1/3" />
      <div className="flex-1 min-h-[120px] bg-[#0a0d14] border border-[#1f2937] rounded-xl" />
      <div className="h-3 bg-[#1f2937] rounded w-1/4" />
    </div>
  );
}

function SaveStatusBadge({ status }) {
  const map = {
    loading: { text: 'Loading…', className: 'text-gray-500' },
    saving: { text: 'Saving…', className: 'text-amber-400/90' },
    saved: { text: 'Saved', className: 'text-[#22c55e]' },
    unsaved: { text: 'Unsaved changes', className: 'text-orange-400' },
    error: { text: 'Save failed', className: 'text-red-400' },
  };
  const cfg = map[status] || map.saved;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.className}`}>
      {cfg.text}
    </span>
  );
}

export function NotesWorkspace({ sessionActive = false, sessionTopicTag = '' }) {
  const [noteId, setNoteId] = useState(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [lastEditedAt, setLastEditedAt] = useState(null);
  const [status, setStatus] = useState('loading');
  const [viewMode, setViewMode] = useState('write');
  const [loadError, setLoadError] = useState('');

  const savedSnapshot = useRef({ content: '', tags: [], isPinned: false });
  const [savedRevision, setSavedRevision] = useState(0);
  const saveTimer = useRef(null);
  const saveSeq = useRef(0);
  const savingRef = useRef(false);
  const textareaRef = useRef(null);

  const isDirty = useMemo(() => {
    const snap = savedSnapshot.current;
    return (
      content !== snap.content
      || JSON.stringify(tags) !== JSON.stringify(snap.tags)
      || isPinned !== snap.isPinned
    );
  }, [content, tags, isPinned, savedRevision]);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;

  const applyServerNote = useCallback((note) => {
    const data = note?.data ?? note;
    const nextContent = data?.content ?? '';
    const nextTags = Array.isArray(data?.tags) ? data.tags : [];
    const nextPinned = Boolean(data?.isPinned);

    setNoteId(data?._id ?? null);
    setContent(nextContent);
    setTags(nextTags);
    setIsPinned(nextPinned);
    setLastEditedAt(data?.lastEditedAt || data?.updatedAt || null);
    savedSnapshot.current = {
      content: nextContent,
      tags: [...nextTags],
      isPinned: nextPinned,
    };
    setStatus('saved');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setLoadError('');
      try {
        const res = await apiFetch('/api/v1/notes/workspace', { auth: true });
        if (cancelled) return;
        applyServerNote(res);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Could not load notes');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [applyServerNote]);

  const persistNote = useCallback(async (payload) => {
    const seq = ++saveSeq.current;
    savingRef.current = true;
    setStatus('saving');
    try {
      const res = await apiFetch('/api/v1/notes/workspace', {
        method: 'PUT',
        auth: true,
        body: payload,
      });
      if (seq !== saveSeq.current) return;
      const data = res?.data ?? res;
      setNoteId(data?._id ?? null);
      setLastEditedAt(data?.lastEditedAt || data?.updatedAt || new Date().toISOString());
      savedSnapshot.current = {
        content: payload.content ?? '',
        tags: payload.tags ?? [],
        isPinned: payload.isPinned ?? false,
      };
      setSavedRevision((n) => n + 1);
      setStatus('saved');
    } catch {
      if (seq === saveSeq.current) setStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (status === 'loading' || loadError || savingRef.current) return;
    if (!isDirty) return;

    setStatus((s) => (s === 'saved' || s === 'unsaved' || s === 'error' ? 'unsaved' : s));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistNote({
        content,
        tags,
        isPinned,
        sessionTopicTag: sessionActive && sessionTopicTag?.trim()
          ? sessionTopicTag.trim()
          : null,
      });
    }, AUTOSAVE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, tags, isPinned, isDirty, loadError, sessionActive, sessionTopicTag, persistNote]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    if (status === 'error') setStatus('unsaved');
    resizeTextarea();
  };

  const handleTagOrPinChange = () => {
    if (status === 'error') setStatus('unsaved');
  };

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(140, Math.min(el.scrollHeight, 420))}px`;
  }, []);

  useEffect(() => {
    if (status !== 'loading' && viewMode === 'write') {
      resizeTextarea();
    }
  }, [content, status, viewMode, resizeTextarea]);

  const toggleTag = (tag) => {
    handleTagOrPinChange();
    setTags((prev) => (
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5)
    ));
  };

  const sessionLabel = sessionActive && sessionTopicTag?.trim()
    ? sessionTopicTag.trim()
    : null;

  return (
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col h-full min-h-[280px] lg:min-h-0 lg:overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-rounded text-[20px] text-[#22c55e] flex-shrink-0">edit_note</span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white leading-tight">Workspace</h2>
            {lastEditedAt && status !== 'loading' && (
              <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                Edited {formatEditedAt(lastEditedAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <SaveStatusBadge status={status} />
          <button
            type="button"
            onClick={() => {
              handleTagOrPinChange();
              setIsPinned((p) => !p);
            }}
            className={`flex items-center gap-0.5 text-[10px] font-medium transition-colors ${
              isPinned ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={isPinned ? 'Unpin note' : 'Pin note'}
            disabled={status === 'loading'}
          >
            <span className="material-symbols-rounded text-[16px]">
              {isPinned ? 'keep' : 'keep_off'}
            </span>
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
      </div>

      {sessionLabel && (
        <div className="mb-2 flex-shrink-0 flex items-center gap-1.5 text-[11px] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-2.5 py-1.5">
          <span className="material-symbols-rounded text-[14px]">play_circle</span>
          <span className="truncate">
            Writing for: <span className="font-semibold">{sessionLabel}</span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
        {NOTE_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={status === 'loading'}
              onClick={() => toggleTag(tag)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                active
                  ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30'
                  : 'bg-[#0a0d14] text-gray-500 border-[#1f2937] hover:border-[#374151] hover:text-gray-300'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mb-2 flex-shrink-0 border-b border-[#1f2937] pb-2">
        <button
          type="button"
          onClick={() => setViewMode('write')}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
            viewMode === 'write' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setViewMode('preview')}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
            viewMode === 'preview' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Preview
        </button>
      </div>

      {loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
          <p className="text-sm text-red-400">{loadError}</p>
          <button
            type="button"
            className="text-xs text-[#22c55e] font-semibold hover:underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : status === 'loading' ? (
        <NotesSkeleton />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {viewMode === 'write' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder={'Write your thoughts, coding notes, todos, debugging ideas…\n\nTip: use # headings, - bullets, and ``` code blocks'}
              className="notes-editor w-full flex-1 min-h-[140px] max-h-[420px] resize-none bg-[#0a0d14] border border-[#1f2937] rounded-xl px-3 py-3 text-sm text-gray-100 placeholder-gray-600 leading-relaxed focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-[border,box-shadow] overflow-y-auto"
              spellCheck
            />
          ) : (
            <div className="notes-markdown flex-1 min-h-[140px] max-h-[420px] overflow-y-auto bg-[#0a0d14] border border-[#1f2937] rounded-xl px-3 py-3 text-sm text-gray-200">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-gray-600 italic">Nothing to preview yet.</p>
              )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-[#1f2937] flex items-center justify-between flex-shrink-0 text-[10px] text-gray-600">
            <span>{wordCount} words · {charCount} characters</span>
            <span className="text-gray-700">Markdown supported</span>
          </div>
        </div>
      )}
    </section>
  );
}
