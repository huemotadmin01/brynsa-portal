/**
 * SettingsTeam — Users & Teams management section
 * Reuses the TeamManagement component from SettingsPage.
 * We import the full SettingsPage and extract its team management logic.
 *
 * For now, this is a standalone re-implementation that calls the same APIs.
 * TODO: Extract TeamManagement from SettingsPage into a shared component.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users, UserPlus, UserX, Mail, Loader2, Check,
  ChevronDown, Clock, UsersRound, Plus, Pencil,
  Trash2, X, ArrowLeftRight
} from 'lucide-react';
import api from '../../utils/api';
import InviteTeamMemberModal from '../InviteTeamMemberModal';

export default function SettingsTeam() {
  const { user, impersonateUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const canChangeRoles = isAdmin;

  const [members, setMembers] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [licenses, setLicenses] = useState(null);

  // Rate limits
  const [editingRateLimits, setEditingRateLimits] = useState(null);
  const [rateLimitValues, setRateLimitValues] = useState({ dailySendLimit: 50, hourlySendLimit: 6 });
  const [savingRateLimits, setSavingRateLimits] = useState(false);
  const [memberRateLimits, setMemberRateLimits] = useState({});

  // Sub-teams
  const [teams, setTeams] = useState([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [manageTeamId, setManageTeamId] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(null);
  const [teamActionLoading, setTeamActionLoading] = useState(false);

  useEffect(() => {
    loadTeam();
    loadMemberRateLimits();
    if (canChangeRoles) { loadInvites(); loadTeams(); }
  }, []);

  async function loadTeam() {
    try {
      const res = await api.getTeamMembers();
      if (res.success) {
        setMembers(res.members);
        setCompanyName(res.companyName || '');
        setLicenses(res.licenses || null);
      }
    } catch (err) { setError(err.message || 'Failed to load team'); } finally { setLoading(false); }
  }

  async function loadMemberRateLimits() {
    try {
      const res = await api.getMemberRateLimits();
      if (res.success) {
        const map = {};
        res.members.forEach(m => { map[m.id] = { dailySendLimit: m.dailySendLimit, hourlySendLimit: m.hourlySendLimit }; });
        setMemberRateLimits(map);
      }
    } catch {}
  }

  async function handleSaveRateLimits(memberId) {
    setSavingRateLimits(true);
    try {
      const res = await api.updateMemberRateLimits(memberId, rateLimitValues);
      if (res.success) {
        setMemberRateLimits(prev => ({ ...prev, [memberId]: res.settings }));
        setEditingRateLimits(null);
        if (res.enrollmentsReset > 0) {
          setError(`✅ Limits updated — ${res.enrollmentsReset} pending emails will start sending now`);
          setTimeout(() => setError(''), 5000);
        }
      } else { setError(res.error || 'Failed to update rate limits'); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message || 'Failed to update rate limits'); setTimeout(() => setError(''), 3000); } finally { setSavingRateLimits(false); }
  }

  async function loadInvites() {
    try { const res = await api.getTeamInvites(); if (res.success) setInvites(res.invites || []); } catch {}
  }

  async function loadTeams() {
    try { const res = await api.getTeams(); if (res.success) setTeams(res.teams || []); } catch {}
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      const res = await api.createTeam(newTeamName.trim(), newTeamLeader || null);
      if (res.success) { setShowCreateTeam(false); setNewTeamName(''); setNewTeamLeader(''); loadTeams(); loadTeam(); }
      else { setError(res.error || 'Failed to create team'); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); } finally { setCreatingTeam(false); }
  }

  async function handleUpdateTeam(teamId, data) {
    setTeamActionLoading(true);
    try {
      const res = await api.updateTeam(teamId, data);
      if (res.success) { setEditingTeam(null); loadTeams(); loadTeam(); }
      else { setError(res.error); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); } finally { setTeamActionLoading(false); }
  }

  async function handleDeleteTeam(teamId) {
    setTeamActionLoading(true); setConfirmDeleteTeam(null);
    try {
      const res = await api.deleteTeam(teamId);
      if (res.success) { loadTeams(); loadTeam(); }
      else { setError(res.error); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); } finally { setTeamActionLoading(false); }
  }

  async function handleAddToTeam(teamId, userId) {
    try {
      const res = await api.addTeamMembers(teamId, [userId]);
      if (res.success) { loadTeams(); loadTeam(); }
      else { setError(res.error); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); }
  }

  async function handleRemoveFromTeam(teamId, userId) {
    try {
      const res = await api.removeTeamMember(teamId, userId);
      if (res.success) { loadTeams(); loadTeam(); }
      else { setError(res.error); setTimeout(() => setError(''), 3000); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); }
  }

  async function handleRoleChange(memberId, newRole) {
    setUpdatingRole(memberId); setOpenDropdown(null);
    try {
      const res = await api.updateMemberRole(memberId, newRole);
      if (res.success) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); } finally { setUpdatingRole(null); }
  }

  async function handleDelete(memberId) {
    setActionLoading(memberId); setConfirmAction(null);
    try {
      const res = await api.deleteTeamMember(memberId);
      if (res.success) { setMembers(prev => prev.filter(m => m.id !== memberId)); loadTeam(); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); } finally { setActionLoading(null); }
  }

  async function handleImpersonate(memberId) {
    const result = await impersonateUser(memberId);
    if (result.success) navigate('/outreach/dashboard');
    else { setError(result.error); setTimeout(() => setError(''), 3000); }
  }

  async function handleCancelInvite(inviteId) {
    try {
      const res = await api.cancelTeamInvite(inviteId);
      if (res.success) { setInvites(prev => prev.filter(i => i.id !== inviteId)); loadTeam(); }
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-rivvra-500 animate-spin" /></div>;
  }

  const adminCount = members.filter(m => m.role === 'admin').length;

  return (
    <>
      <div className="space-y-6">
        {/* Team Members */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Team Members</h2>
              <p className="text-dark-400 text-sm mt-1">
                {companyName && <span className="text-dark-300">{companyName}</span>}
                {companyName && ' · '}{members.length} member{members.length !== 1 ? 's' : ''}
                {licenses && (
                  <span className="ml-2 text-dark-500">
                    · <span className={licenses.remaining <= 0 ? 'text-red-400' : 'text-rivvra-400'}>{licenses.used}/{licenses.total}</span> licenses used
                  </span>
                )}
              </p>
            </div>
            {canChangeRoles && (
              <button
                onClick={() => setInviteOpen(true)}
                disabled={licenses && licenses.remaining <= 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  licenses && licenses.remaining <= 0 ? 'bg-dark-700 text-dark-400 cursor-not-allowed' : 'bg-rivvra-500 text-dark-950 hover:bg-rivvra-400'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
            )}
          </div>

          {licenses && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${
              licenses.remaining <= 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-rivvra-500/5 border border-rivvra-500/20'
            }`}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-dark-400" />
                <span className={licenses.remaining <= 0 ? 'text-red-400' : 'text-dark-300'}>
                  {licenses.remaining > 0 ? `${licenses.remaining} license${licenses.remaining !== 1 ? 's' : ''} remaining` : 'All licenses are in use'}
                </span>
              </div>
              <span className="text-dark-500 text-xs">{licenses.used} active{licenses.pendingInvites > 0 ? ` · ${licenses.pendingInvites} pending` : ''} / {licenses.total} total</span>
            </div>
          )}

          {error && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${error.startsWith('✅') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {error}
            </div>
          )}

          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.id === user?.id;
              const isOnlyAdmin = member.role === 'admin' && adminCount <= 1;
              const limits = memberRateLimits[member.id];
              const isEditingLimits = editingRateLimits === member.id;

              return (
                <div key={member.id} className={`rounded-xl transition-colors ${isCurrentUser ? 'bg-rivvra-500/5 border border-rivvra-500/20' : 'bg-dark-800/40 border border-dark-700/50'}`}>
                  <div className="flex items-center gap-4 px-4 py-3">
                    {member.picture ? (
                      <img src={member.picture} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-dark-300">{member.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{member.name || 'Unnamed'}</span>
                        {isCurrentUser && <span className="text-[10px] text-rivvra-400 bg-rivvra-500/10 px-1.5 py-0.5 rounded font-medium">You</span>}
                      </div>
                      <p className="text-xs text-dark-400 truncate">
                        {member.email}
                        {member.teamName && <span className="ml-1.5 text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">{member.teamName}</span>}
                      </p>
                    </div>

                    {/* Rate limit badge */}
                    {limits && (
                      canChangeRoles ? (
                        <button
                          onClick={() => { isEditingLimits ? setEditingRateLimits(null) : (() => { setEditingRateLimits(member.id); setRateLimitValues({ dailySendLimit: limits.dailySendLimit, hourlySendLimit: limits.hourlySendLimit }); })(); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors flex-shrink-0 ${
                            isEditingLimits ? 'bg-rivvra-500/20 text-rivvra-400 border border-rivvra-500/30' : 'bg-dark-700/30 text-dark-400 border border-dark-600/50 hover:bg-dark-700/60'
                          }`}
                        >
                          <Mail className="w-3 h-3" />{limits.hourlySendLimit}/hr · {limits.dailySendLimit}/day
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-dark-700/30 text-dark-400 border border-dark-600/50 flex-shrink-0">
                          <Mail className="w-3 h-3" />{limits.hourlySendLimit}/hr · {limits.dailySendLimit}/day
                        </span>
                      )
                    )}

                    {/* Role badge */}
                    <div className="relative flex-shrink-0">
                      {updatingRole === member.id || actionLoading === member.id ? (
                        <Loader2 className="w-4 h-4 text-rivvra-500 animate-spin" />
                      ) : canChangeRoles ? (
                        <button
                          onClick={() => setOpenDropdown(openDropdown === member.id ? null : member.id)}
                          disabled={isOnlyAdmin && isCurrentUser}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            member.role === 'admin' ? 'bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20'
                            : member.role === 'team_lead' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-dark-700/50 text-dark-300 border border-dark-600'
                          } ${isOnlyAdmin && isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-dark-600 cursor-pointer'}`}
                        >
                          {member.role === 'admin' ? 'Admin' : member.role === 'team_lead' ? 'Team Lead' : 'Member'}
                          {!(isOnlyAdmin && isCurrentUser) && <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          member.role === 'admin' ? 'bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20'
                          : member.role === 'team_lead' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-dark-700/50 text-dark-300 border border-dark-600'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : member.role === 'team_lead' ? 'Team Lead' : 'Member'}
                        </span>
                      )}

                      {canChangeRoles && openDropdown === member.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute right-0 bottom-full mb-1 z-50 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl py-1 min-w-[160px]">
                            {[{ value: 'admin', label: 'Admin' }, { value: 'team_lead', label: 'Team Lead' }, { value: 'member', label: 'Member' }].map((roleOption) => (
                              <button
                                key={roleOption.value}
                                onClick={() => handleRoleChange(member.id, roleOption.value)}
                                disabled={isOnlyAdmin && member.role === 'admin' && roleOption.value !== 'admin'}
                                className={`w-full px-4 py-2 text-left text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 ${member.role === roleOption.value ? 'text-rivvra-400' : 'text-dark-300'}`}
                              >
                                {member.role === roleOption.value && <Check className="w-3 h-3" />}
                                <span className={member.role === roleOption.value ? '' : 'ml-5'}>{roleOption.label}</span>
                              </button>
                            ))}
                            {!isCurrentUser && (
                              <>
                                <div className="border-t border-dark-600 my-1" />
                                <button onClick={() => { setOpenDropdown(null); handleImpersonate(member.id); }} className="w-full px-4 py-2 text-left text-xs hover:bg-dark-700 text-amber-400 flex items-center gap-2"><ArrowLeftRight className="w-3 h-3" />Login As</button>
                                <button onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'delete', member }); }} className="w-full px-4 py-2 text-left text-xs hover:bg-dark-700 text-red-400 flex items-center gap-2"><UserX className="w-3 h-3" />Remove from Team</button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rate limit editor */}
                  {isEditingLimits && (
                    <div className="px-4 pb-3 pt-1 border-t border-dark-700/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-dark-400 whitespace-nowrap">Hourly:</label>
                          <input type="number" min="1" max="50" value={rateLimitValues.hourlySendLimit}
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setRateLimitValues(p => ({ ...p, hourlySendLimit: Math.min(50, Math.max(1, v)) })); }}
                            className="w-16 px-2 py-1 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white text-center focus:outline-none focus:border-rivvra-500" />
                          <span className="text-[11px] text-dark-500">/hr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-dark-400 whitespace-nowrap">Daily:</label>
                          <input type="number" min="1" max="200" value={rateLimitValues.dailySendLimit}
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) setRateLimitValues(p => ({ ...p, dailySendLimit: Math.min(200, Math.max(1, v)) })); }}
                            className="w-16 px-2 py-1 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white text-center focus:outline-none focus:border-rivvra-500" />
                          <span className="text-[11px] text-dark-500">/day</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button onClick={() => setEditingRateLimits(null)} className="px-3 py-1 text-[11px] text-dark-400 hover:text-white">Cancel</button>
                          <button onClick={() => handleSaveRateLimits(member.id)} disabled={savingRateLimits} className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 disabled:opacity-50">
                            {savingRateLimits ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invites */}
        {canChangeRoles && invites.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-dark-400" />Pending Invites</h3>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-amber-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{invite.email}</p>
                    <p className="text-xs text-dark-500">Invited as {invite.role === 'team_lead' ? 'Team Lead' : 'Member'} · {new Date(invite.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleCancelInvite(invite.id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 hover:bg-red-500/10 rounded-lg">Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-Teams */}
        {canChangeRoles && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><UsersRound className="w-4 h-4 text-dark-400" />Teams</h3>
              <button onClick={() => setShowCreateTeam(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rivvra-500 text-dark-950 rounded-lg text-xs font-semibold hover:bg-rivvra-400">
                <Plus className="w-3 h-3" />Create Team
              </button>
            </div>

            {showCreateTeam && (
              <div className="mb-4 p-4 bg-dark-800/50 border border-dark-700 rounded-xl space-y-3">
                <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 text-sm focus:outline-none focus:border-rivvra-500" autoFocus />
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Team Lead (optional)</label>
                  <select value={newTeamLeader} onChange={(e) => setNewTeamLeader(e.target.value)} className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-rivvra-500">
                    <option value="">Select a team lead...</option>
                    {members.filter(m => !m.teamId && m.id !== user?.id).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => { setShowCreateTeam(false); setNewTeamName(''); setNewTeamLeader(''); }} className="px-3 py-1.5 text-xs text-dark-400 hover:text-white">Cancel</button>
                  <button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()} className="px-4 py-1.5 bg-rivvra-500 text-dark-950 rounded-lg text-xs font-semibold hover:bg-rivvra-400 disabled:opacity-50 flex items-center gap-1.5">
                    {creatingTeam ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Create
                  </button>
                </div>
              </div>
            )}

            {teams.length === 0 && !showCreateTeam ? (
              <p className="text-dark-500 text-sm text-center py-4">No teams created yet.</p>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="px-4 py-3 bg-dark-800/40 border border-dark-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {editingTeam?.id === team.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={editingTeam.name} onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })} className="px-2 py-1 bg-dark-800 border border-dark-600 rounded text-white text-sm focus:outline-none focus:border-rivvra-500" />
                            <button onClick={() => handleUpdateTeam(team.id, { name: editingTeam.name })} disabled={teamActionLoading} className="text-rivvra-400 text-xs">Save</button>
                            <button onClick={() => setEditingTeam(null)} className="text-dark-400 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <h4 className="text-sm font-medium text-white">{team.name}</h4>
                        )}
                        <p className="text-xs text-dark-500 mt-0.5">Lead: <span className="text-dark-300">{team.leaderName || 'Unassigned'}</span> · {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setManageTeamId(manageTeamId === team.id ? null : team.id)} className="px-2.5 py-1 text-xs text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg"><Users className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingTeam({ id: team.id, name: team.name, leaderId: team.leaderId })} className="px-2.5 py-1 text-xs text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDeleteTeam(team)} className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {manageTeamId === team.id && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <p className="text-[10px] uppercase text-dark-500 font-semibold mb-2 tracking-wider">Members</p>
                        <div className="space-y-1 mb-3">
                          {team.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-dark-700/50">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-white truncate">{m.name || m.email}</span>
                                {m.id === team.leaderId && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded">Lead</span>}
                              </div>
                              <button onClick={() => handleRemoveFromTeam(team.id, m.id)} className="text-dark-500 hover:text-red-400 flex-shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                        {(() => {
                          const unassigned = members.filter(m => !m.teamId && m.role !== 'admin');
                          if (unassigned.length === 0) return <p className="text-dark-500 text-xs">All members are assigned.</p>;
                          return (
                            <>
                              <p className="text-[10px] uppercase text-dark-500 font-semibold mb-2 tracking-wider">Add Members</p>
                              <div className="space-y-1">
                                {unassigned.map((m) => (
                                  <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-dark-700/50">
                                    <span className="text-xs text-dark-300 truncate">{m.name || m.email}</span>
                                    <button onClick={() => handleAddToTeam(team.id, m.id)} className="text-rivvra-400 hover:text-rivvra-300 text-xs font-medium">Add</button>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        <div className="mt-3 pt-2 border-t border-dark-700/50">
                          <label className="block text-[10px] uppercase text-dark-500 font-semibold mb-1 tracking-wider">Team Lead</label>
                          <select value={team.leaderId || ''} onChange={(e) => handleUpdateTeam(team.id, { leaderId: e.target.value || null })} className="w-full px-2 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-xs focus:outline-none focus:border-rivvra-500">
                            <option value="">No lead assigned</option>
                            {team.members.map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setConfirmDeleteTeam(null)} />
          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <div><h3 className="text-white font-semibold">Delete Team</h3><p className="text-dark-400 text-sm">{confirmDeleteTeam.name}</p></div>
            </div>
            <p className="text-dark-300 text-sm mb-6">This will remove the team. All members will become unassigned.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDeleteTeam(null)} className="px-4 py-2 text-sm text-dark-400 hover:text-white">Cancel</button>
              <button onClick={() => handleDeleteTeam(confirmDeleteTeam.id)} className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-400">Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10"><UserX className="w-5 h-5 text-red-400" /></div>
              <div><h3 className="text-white font-semibold">Remove from Team</h3><p className="text-dark-400 text-sm">{confirmAction.member.name || confirmAction.member.email}</p></div>
            </div>
            <p className="text-dark-300 text-sm mb-6">This will remove this user from your team. They will lose access to team data and paid features.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm text-dark-400 hover:text-white">Cancel</button>
              <button onClick={() => handleDelete(confirmAction.member.id)} className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-400">Remove</button>
            </div>
          </div>
        </div>
      )}

      <InviteTeamMemberModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onInviteSent={() => { loadInvites(); loadTeam(); }} licenses={licenses} />
    </>
  );
}
