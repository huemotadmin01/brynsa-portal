import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, RefreshCw, Loader2, Users, Mail, Send, Eye,
  MousePointerClick, AlertTriangle, TrendingUp, ShieldAlert,
  Clock, UserCheck, MessageSquare
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const STATUS_CONFIG = {
  not_contacted: { label: 'Not Contacted', color: '#6b7280' },
  in_sequence: { label: 'In Sequence', color: '#3b82f6' },
  replied: { label: 'Replied', color: '#22c55e' },
  replied_not_interested: { label: 'Not Interested', color: '#ef4444' },
  no_response: { label: 'No Response', color: '#f59e0b' },
  bounced: { label: 'Bounced', color: '#f97316' },
  meeting_scheduled: { label: 'Meeting', color: '#8b5cf6' },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || '#22c55e' }}>
          {p.value}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-dark-400">{d.name}</p>
      <p className="text-sm font-semibold text-white">{d.value.toLocaleString()}</p>
    </div>
  );
}

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const canView = user?.role === 'admin' || user?.role === 'team_lead';

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setData(res);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(res.error || 'Failed to load');
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canView) fetchData();
  }, [canView, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [canView, fetchData]);

  if (!canView) {
    return (
      <Layout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <ShieldAlert className="w-12 h-12 text-dark-600 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-1">Access Restricted</h2>
          <p className="text-sm text-dark-400">This dashboard is available to Admin and Team Lead roles only.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-rivvra-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Prepare chart data
  const statusData = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({
      name: cfg.label,
      value: data?.leadsByStatus?.[key] || 0,
      color: cfg.color,
    }))
    .filter(d => d.value > 0);

  const inSequenceData = (data?.inSequenceByUser || []).map(r => ({
    name: r.sourcedBy?.split(' ')[0] || 'Unknown',
    fullName: r.sourcedBy || 'Unknown',
    count: r.count,
  }));

  const totalInSequence = data?.leadsByStatus?.in_sequence || 0;

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rivvra-500" />
              Team Performance Dashboard
            </h1>
            <p className="text-xs text-dark-500 mt-1">
              {data?.teamMembers?.length || 0} team members
              {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
              {' · Auto-refreshes every 30s'}
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 hover:text-white hover:border-dark-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Leads"
            value={data?.totalLeads || 0}
            icon={Users}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            label="In Sequence"
            value={totalInSequence}
            icon={Send}
            color="text-rivvra-400"
            bgColor="bg-rivvra-500/10"
          />
          <StatCard
            label="Response Rate"
            value={`${data?.responseRate?.rate || 0}%`}
            icon={TrendingUp}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
            subtitle={`${data?.responseRate?.repliedOrMeeting || 0} / ${data?.responseRate?.totalContacted || 0} contacted`}
          />
          <StatCard
            label="Overdue Follow-ups"
            value={data?.overdueFollowups || 0}
            icon={AlertTriangle}
            color={data?.overdueFollowups > 0 ? 'text-red-400' : 'text-dark-400'}
            bgColor={data?.overdueFollowups > 0 ? 'bg-red-500/10' : 'bg-dark-800'}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Bar Chart: In Sequence by User */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-rivvra-500" />
              In Sequence by Sourced By
            </h3>
            {inSequenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inSequenceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-dark-500 text-sm">
                No leads in sequence yet
              </div>
            )}
          </div>

          {/* Donut: Leads by Status */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Leads by Status
            </h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-dark-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-dark-500 text-sm">
                No data
              </div>
            )}
          </div>
        </div>

        {/* Status breakdown table */}
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Leads by Status Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = data?.leadsByStatus?.[key] || 0;
              const pct = data?.totalLeads > 0 ? ((count / data.totalLeads) * 100).toFixed(1) : '0.0';
              return (
                <div key={key} className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <span className="text-[10px] text-dark-400 uppercase tracking-wider">{cfg.label}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{count.toLocaleString()}</div>
                  <div className="text-[10px] text-dark-500">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tables row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Leads Scraped Today */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Leads Scraped Today
            </h3>
            {(data?.leadsScrapedToday?.length || 0) > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-dark-500 text-xs uppercase border-b border-dark-700">
                    <th className="text-left py-2 font-medium">Sourced By</th>
                    <th className="text-right py-2 font-medium">Leads Today</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leadsScrapedToday.map((r, i) => (
                    <tr key={i} className="border-b border-dark-800 last:border-0">
                      <td className="py-2 text-dark-300">{r.sourcedBy}</td>
                      <td className="py-2 text-right text-white font-medium">{r.count}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-dark-600">
                    <td className="py-2 text-dark-400 font-medium">Total</td>
                    <td className="py-2 text-right text-white font-bold">
                      {data.leadsScrapedToday.reduce((s, r) => s + r.count, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-dark-500 text-xs py-4 text-center">No leads scraped today</p>
            )}
          </div>

          {/* Follow-ups Due Today */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              Follow-ups Due Today
            </h3>
            {(data?.followupsDueToday?.length || 0) > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-dark-500 text-xs uppercase border-b border-dark-700">
                    <th className="text-left py-2 font-medium">Owner</th>
                    <th className="text-right py-2 font-medium">FU Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.followupsDueToday.map((r, i) => (
                    <tr key={i} className="border-b border-dark-800 last:border-0">
                      <td className="py-2 text-dark-300">{r.sourcedBy}</td>
                      <td className="py-2 text-right text-white font-medium">{r.count}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-dark-600">
                    <td className="py-2 text-dark-400 font-medium">Total</td>
                    <td className="py-2 text-right text-white font-bold">
                      {data.followupsDueToday.reduce((s, r) => s + r.count, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-dark-500 text-xs py-4 text-center">No follow-ups due today</p>
            )}
          </div>
        </div>

        {/* Email Stats */}
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Email Performance (All Sequences)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <EmailStatCard label="Sent" value={data?.emailStats?.sent || 0} icon={Send} color="text-blue-400" />
            <EmailStatCard label="Opened" value={data?.emailStats?.opened || 0} icon={Eye} color="text-purple-400" />
            <EmailStatCard label="Clicked" value={data?.emailStats?.clicked || 0} icon={MousePointerClick} color="text-amber-400" />
            <EmailStatCard label="Replied" value={data?.emailStats?.replied || 0} icon={MessageSquare} color="text-emerald-400" />
            <EmailStatCard label="Bounced" value={data?.emailStats?.bounced || 0} icon={AlertTriangle} color="text-red-400" />
          </div>
        </div>

        {/* In Sequence by User — table (below chart for detail) */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-rivvra-500" />
            In Sequence by Sourced By
          </h3>
          {(data?.inSequenceByUser?.length || 0) > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dark-500 text-xs uppercase border-b border-dark-700">
                  <th className="text-left py-2 font-medium">Sourced By</th>
                  <th className="text-right py-2 font-medium">In Sequence</th>
                </tr>
              </thead>
              <tbody>
                {data.inSequenceByUser.map((r, i) => (
                  <tr key={i} className="border-b border-dark-800 last:border-0">
                    <td className="py-2 text-dark-300">{r.sourcedBy}</td>
                    <td className="py-2 text-right text-white font-medium">{r.count}</td>
                  </tr>
                ))}
                <tr className="border-t border-dark-600">
                  <td className="py-2 text-dark-400 font-medium">Total</td>
                  <td className="py-2 text-right text-white font-bold">
                    {data.inSequenceByUser.reduce((s, r) => s + r.count, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-dark-500 text-xs py-4 text-center">No leads in sequence</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color, bgColor, subtitle }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-dark-500 uppercase tracking-wider font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtitle && <div className="text-[10px] text-dark-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function EmailStatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
      <div className="text-lg font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-[10px] text-dark-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
