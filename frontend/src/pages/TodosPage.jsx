import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../api/client';
import { Navbar } from '../components/Navbar.jsx';

function TodoCard({ todo, onToggle, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(todo);
    setToggling(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(todo);
    setDeleting(false);
  };

  return (
    <article
      className={`group bg-[#111827] border rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-200 hover:border-[#374151] ${todo.isCompleted
        ? 'border-[#1a2235] opacity-70'
        : 'border-[#1f2937] hover:shadow-lg hover:shadow-black/20'
        }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <input
          type="checkbox"
          id={`todo-${todo._id}`}
          checked={!!todo.isCompleted}
          onChange={handleToggle}
          disabled={toggling}
          className="cursor-pointer disabled:opacity-50"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm leading-relaxed ${todo.isCompleted ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
          {todo.topicTag}
        </p>
        {todo.description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{todo.description}</p>
        )}
        {todo.createdAt && (
          <p className="text-[11px] text-gray-700 mt-2">
            {new Date(todo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-30"
        title="Delete task"
      >
        <span className="material-symbols-rounded text-[18px]">delete</span>
      </button>
    </article>
  );
}

function AddTodoModal({ onAdd, onClose }) {
  const [topicTag, setTopicTag] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topicTag.trim()) return;
    setSaving(true);
    await onAdd({ topicTag: topicTag.trim(), description: description.trim() });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md animate-[slideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between p-5 border-b border-[#1f2937]">
          <h2 className="font-semibold text-white">New Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Title *</label>
            <input
              ref={inputRef}
              type="text"
              value={topicTag}
              onChange={(e) => setTopicTag(e.target.value)}
              required
              className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
              placeholder="e.g. Refactor Auth Module"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-gray-300 font-medium py-3 px-4 rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !topicTag.trim()}
              className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm shadow-lg shadow-green-500/20 active:scale-[0.98]"
            >
              {saving ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all'); // all | pending | completed
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadTodos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (filter === 'completed') params.set('completed', 'true');
      if (filter === 'pending') params.set('completed', 'false');
      if (search.trim()) params.set('s', search.trim());
      const res = await apiFetch(`/api/v1/todos?${params}`, { auth: true });
      const data = res?.data || res;
      setTodos(data?.todos || data?.data?.todos || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTodos(); }, [filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadTodos();
  };

  const handleAdd = async ({ topicTag, description }) => {
    try {
      const res = await apiFetch('/api/v1/todos', {
        method: 'POST', auth: true,
        body: { topicTag, description },
      });
      const created = res?.data || res;
      setTodos((prev) => [created, ...prev]);
    } catch (err) {
      alert(err.message || 'Failed to add task');
    }
  };

  const handleToggle = async (todo) => {
    try {
      const res = await apiFetch(`/api/v1/todos/${todo._id}/toggle`, { method: 'PATCH', auth: true });
      const updated = res?.data || res;
      setTodos((prev) => prev.map((t) => (t._id === todo._id ? updated : t)));
    } catch { /* silent */ }
  };

  const handleDelete = async (todo) => {
    try {
      await apiFetch(`/api/v1/todos/${todo._id}/delete`, { method: 'DELETE', auth: true });
      setTodos((prev) => prev.filter((t) => t._id !== todo._id));
    } catch { /* silent */ }
  };

  const pending = todos.filter((t) => !t.isCompleted).length;
  const completed = todos.filter((t) => t.isCompleted).length;

  const filterLabels = [
    { key: 'all', label: 'All', count: todos.length },
    { key: 'pending', label: 'Active', count: pending },
    { key: 'completed', label: 'Done', count: completed },
  ];

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      <Navbar />
      {showModal && <AddTodoModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Workspace</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your development roadmap and sprints.</p>
          </div>
          <button
            id="add-task-btn"
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-green-500/20"
          >
            <span className="material-symbols-rounded text-[18px]">add</span>
            Add Task
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: todos.length, color: 'text-white' },
            { label: 'Active', value: pending, color: 'text-orange-400' },
            { label: 'Completed', value: completed, color: 'text-[#22c55e]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-[18px] text-gray-500">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111827] border border-[#1f2937] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
              placeholder="Search tasks..."
            />
          </form>
          <div className="flex bg-[#111827] border border-[#1f2937] rounded-xl p-1 gap-1">
            {filterLabels.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${filter === key
                  ? 'bg-[#22c55e] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {label}
                <span className={`ml-1.5 text-xs ${filter === key ? 'text-green-200' : 'text-gray-600'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Todo List */}
        <section>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-[#22c55e] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-500">Loading tasks...</p>
              </div>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1f2937] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-[32px] text-gray-600">checklist</span>
              </div>
              <p className="text-gray-400 font-medium">No tasks yet</p>
              <p className="text-sm text-gray-600 mt-1">Add your first task to get started</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-[#22c55e] text-sm hover:text-green-400 transition-colors font-medium"
              >
                + Create a task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todos.map((todo) => (
                <TodoCard key={todo._id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TodosPage;
