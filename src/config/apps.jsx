import {
  Send, Users, List, Home, BarChart3, UsersRound, Layers,
  Clock, Briefcase, UserSearch, Mail
} from 'lucide-react';

export const APP_REGISTRY = {
  outreach: {
    id: 'outreach',
    name: 'Outreach',
    description: 'Sales outreach & email sequences',
    icon: Mail,
    color: 'rivvra',
    basePath: '/outreach',
    status: 'active',
    defaultRoute: '/outreach/dashboard',
    getSidebarItems: (user) => {
      const isAdmin = user?.role === 'admin' || user?.role === 'team_lead';
      return [
        { type: 'item', path: '/outreach/dashboard', label: 'Home', icon: Home },
        { type: 'item', path: '/outreach/engage', label: 'Engage', icon: Send },
        {
          type: 'group',
          label: 'Contacts',
          icon: Users,
          children: [
            { path: '/outreach/leads', label: 'My Contacts', icon: Users },
            ...(isAdmin ? [{ path: '/outreach/team-contacts', label: 'Team Contacts', icon: UsersRound }] : []),
          ],
        },
        {
          type: 'group',
          label: 'Lists',
          icon: Layers,
          children: [
            { path: '/outreach/lists', label: 'My Lists', icon: List },
            { path: '/outreach/team-lists', label: 'Team Lists', icon: Layers },
          ],
        },
        ...(isAdmin ? [{ type: 'item', path: '/outreach/team-dashboard', label: 'Team Dashboard', icon: BarChart3 }] : []),
      ];
    },
  },

  timesheet: {
    id: 'timesheet',
    name: 'Timesheet',
    description: 'Track hours & manage payroll',
    icon: Clock,
    color: 'blue',
    basePath: '/timesheet',
    status: 'coming_soon',
    defaultRoute: '/timesheet/dashboard',
    getSidebarItems: () => [],
  },

  crm: {
    id: 'crm',
    name: 'CRM',
    description: 'Manage deals & pipeline',
    icon: Briefcase,
    color: 'purple',
    basePath: '/crm',
    status: 'coming_soon',
    defaultRoute: '/crm/dashboard',
    getSidebarItems: () => [],
  },

  ats: {
    id: 'ats',
    name: 'ATS',
    description: 'Applicant tracking & hiring',
    icon: UserSearch,
    color: 'orange',
    basePath: '/ats',
    status: 'coming_soon',
    defaultRoute: '/ats/dashboard',
    getSidebarItems: () => [],
  },
};

export function getAppById(id) {
  return APP_REGISTRY[id] || null;
}

export function getAllApps() {
  return Object.values(APP_REGISTRY);
}

export function getActiveApps() {
  return Object.values(APP_REGISTRY).filter(app => app.status === 'active');
}

export function getAppByPath(pathname) {
  return Object.values(APP_REGISTRY).find(app =>
    pathname.startsWith(app.basePath)
  ) || null;
}
