import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '../../context/OrgContext';
import { useToast } from '../../context/ToastContext';
import crmApi from '../../utils/crmApi';
import {
  Settings, Plus, Trash2, GripVertical, Edit3, Check, X,
  Tag, Loader2, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react';

// ── Section: Stages ──────────────────────────────────────────────────────
function StagesConfig({ orgSlug }) {
  const { addToast } = useToast();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.listStages(orgSlug);
      if (res.success) setStages(res.stages || []);
    } catch {} finally { setLoading(false); }
  }, [orgSlug]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await crmApi.createStage(orgSlug, { name: newName.trim() });
      setNewName('');
      fetch();
      addToast('Stage created', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const handleUpdate = async (id) => {
    try {
      await crmApi.updateStage(orgSlug, id, { name: editName });
      setEditId(null);
      fetch();
    } catch { addToast('Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await crmApi.deleteStage(orgSlug, id);
      fetch();
      addToast('Stage deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Cannot delete', 'error');
    }
  };

  const handleToggleWon = async (id, current) => {
    try {
      await crmApi.updateStage(orgSlug, id, { isWonStage: !current });
      fetch();
    } catch {}
  };

  if (loading) return <Loader2 size={16} className="animate-spin text-dark-500" />;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-dark-200">Pipeline Stages</h3>
      <div className="space-y-1">
        {stages.map(s => (
          <div key={s._id} className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg">
            <GripVertical size={12} className="text-dark-600" />
            {editId === s._id ? (
              <div className="flex items-center gap-1 flex-1">
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-dark-900 border border-dark-600 rounded px-2 py-1 text-xs text-dark-100 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(s._id)} autoFocus />
                <button onClick={() => handleUpdate(s._id)} className="text-emerald-400"><Check size={13} /></button>
                <button onClick={() => setEditId(null)} className="text-dark-500"><X size={13} /></button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-xs text-dark-200">{s.name}</span>
                {s.isWonStage && <span className="text-[9px] bg-amber-500/15 text-amber-400 rounded px-1.5 py-0.5">WON</span>}
                <button onClick={() => handleToggleWon(s._id, s.isWonStage)}
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${s.isWonStage ? 'border-amber-500/30 text-amber-400' : 'border-dark-600 text-dark-500 hover:text-dark-300'}`}>
                  {s.isWonStage ? 'Unmark Won' : 'Mark Won'}
                </button>
                <button onClick={() => { setEditId(s._id); setEditName(s.name); }} className="text-dark-500 hover:text-dark-300"><Edit3 size={12} /></button>
                <button onClick={() => handleDelete(s._id)} className="text-dark-500 hover:text-red-400"><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New stage name"
          className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-dark-100 focus:border-rivvra-500 focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button onClick={handleCreate} disabled={!newName.trim()}
          className="px-3 py-1.5 text-xs bg-rivvra-500 text-white rounded-lg hover:bg-rivvra-600 disabled:opacity-50">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Section: Tags ────────────────────────────────────────────────────────
function TagsConfig({ orgSlug }) {
  const { addToast } = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.listTags(orgSlug);
      if (res.success) setTags(res.tags || []);
    } catch {} finally { setLoading(false); }
  }, [orgSlug]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await crmApi.createTag(orgSlug, { name: newName.trim() });
      setNewName('');
      fetch();
    } catch (err) {
      addToast(err.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await crmApi.deleteTag(orgSlug, id);
      fetch();
    } catch {}
  };

  if (loading) return <Loader2 size={16} className="animate-spin text-dark-500" />;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-dark-200">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <span key={t._id} className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800 border border-dark-600 rounded-full text-xs text-dark-300">
            <Tag size={10} /> {t.name}
            <button onClick={() => handleDelete(t._id)} className="text-dark-600 hover:text-red-400"><X size={10} /></button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-xs text-dark-600">No tags</p>}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New tag"
          className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-dark-100 focus:border-rivvra-500 focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button onClick={handleCreate} disabled={!newName.trim()}
          className="px-3 py-1.5 text-xs bg-rivvra-500 text-white rounded-lg hover:bg-rivvra-600 disabled:opacity-50">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Section: Lost Reasons ────────────────────────────────────────────────
function LostReasonsConfig({ orgSlug }) {
  const { addToast } = useToast();
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const fetch = useCallback(async () => {
    try {
      const res = await crmApi.listLostReasons(orgSlug);
      if (res.success) setReasons(res.reasons || []);
    } catch {} finally { setLoading(false); }
  }, [orgSlug]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await crmApi.createLostReason(orgSlug, { name: newName.trim() });
      setNewName('');
      fetch();
    } catch (err) {
      addToast(err.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await crmApi.deleteLostReason(orgSlug, id);
      fetch();
    } catch {}
  };

  if (loading) return <Loader2 size={16} className="animate-spin text-dark-500" />;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-dark-200">Lost Reasons</h3>
      <div className="space-y-1">
        {reasons.map(r => (
          <div key={r._id} className="flex items-center justify-between px-3 py-1.5 bg-dark-800 rounded-lg">
            <span className="text-xs text-dark-300">{r.name}</span>
            <button onClick={() => handleDelete(r._id)} className="text-dark-600 hover:text-red-400"><Trash2 size={12} /></button>
          </div>
        ))}
        {reasons.length === 0 && <p className="text-xs text-dark-600">No lost reasons</p>}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New reason"
          className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs text-dark-100 focus:border-rivvra-500 focus:outline-none"
          onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        <button onClick={handleCreate} disabled={!newName.trim()}
          className="px-3 py-1.5 text-xs bg-rivvra-500 text-white rounded-lg hover:bg-rivvra-600 disabled:opacity-50">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function CrmConfig() {
  const { slug } = useOrg();

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-dark-400" />
        <h1 className="text-lg font-semibold text-dark-100">CRM Configuration</h1>
      </div>

      <div className="bg-dark-850 border border-dark-700 rounded-xl p-5">
        <StagesConfig orgSlug={slug} />
      </div>

      <div className="bg-dark-850 border border-dark-700 rounded-xl p-5">
        <TagsConfig orgSlug={slug} />
      </div>

      <div className="bg-dark-850 border border-dark-700 rounded-xl p-5">
        <LostReasonsConfig orgSlug={slug} />
      </div>
    </div>
  );
}
