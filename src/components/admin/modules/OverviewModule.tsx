import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Flag,
  HandHeart,
  Inbox,
  Lock,
  Mail,
  Users,
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDateShort } from '../../../lib/api.ts';

interface OverviewResponse {
  stats: {
    total_enquiries: number;
    volunteer_applications: number;
    partnership_enquiries: number;
    active_campaigns: number;
    upcoming_events: number;
    newsletter_subscribers: number;
    unread_notifications: number;
  };
  donationsUnlocked: boolean;
  donationStats: {
    total_verified_cents: number;
    verified_count: number;
    pending_verification_count: number;
  } | null;
  recentSubmissions: Array<{
    id: number;
    title: string;
    email: string;
    detail: string;
    status: string;
    created_at: string;
    kind: string;
  }>;
  recentActivity: Array<{
    id: number;
    admin_email: string;
    action: string;
    module: string;
    target_id: string;
    created_at: string;
  }>;
}

export const OverviewModule: React.FC<{
  onNavigateModule: (moduleKey: string) => void;
}> = ({ onNavigateModule }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<OverviewResponse>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-28 bg-white border border-stone-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
        {error || 'Dashboard data unavailable.'}
      </div>
    );
  }

  const cards = [
    {
      label: 'Website Enquiries',
      value: data.stats.total_enquiries,
      icon: Inbox,
      module: 'contact',
      accent: 'text-[#4A0E36]',
    },
    {
      label: 'Volunteer Applications',
      value: data.stats.volunteer_applications,
      icon: Users,
      module: 'get_involved',
      accent: 'text-[#0E7C7B]',
    },
    {
      label: 'Partnership Enquiries',
      value: data.stats.partnership_enquiries,
      icon: HandHeart,
      module: 'get_involved',
      accent: 'text-[#F38B1C]',
    },
    {
      label: 'Active Campaigns',
      value: data.stats.active_campaigns,
      icon: Flag,
      module: 'campaigns',
      accent: 'text-[#4A0E36]',
    },
    {
      label: 'Upcoming Events',
      value: data.stats.upcoming_events,
      icon: Calendar,
      module: 'campaigns',
      accent: 'text-[#0E7C7B]',
    },
    {
      label: 'Newsletter Subscribers',
      value: data.stats.newsletter_subscribers,
      icon: Mail,
      module: 'newsletter',
      accent: 'text-[#F38B1C]',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Dashboard Overview</h1>
        <p className="text-sm text-stone-600 mt-1">
          Live operational summary across BraidsofHope website submissions, programmes, and activity.
        </p>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => onNavigateModule(c.module)}
              className="text-left bg-white border border-stone-200 rounded-xl p-5 hover:border-[#4A0E36]/40 transition-colors flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-xs font-medium text-stone-500">{c.label}</div>
                <div className={`text-3xl font-bold mt-1 tabular-nums ${c.accent}`}>{c.value}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#FAF5EE] flex items-center justify-center text-[#4A0E36] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Donation Summary (Strictly reflects developer entitlement) */}
      {data.donationsUnlocked && data.donationStats ? (
        <div className="bg-white border border-stone-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-stone-500 font-medium">Verified Donations Total</div>
            <div className="text-2xl font-bold text-[#0E7C7B] mt-1 tabular-nums">
              {formatCurrency(data.donationStats.total_verified_cents)}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500 font-medium">Verified Transactions</div>
            <div className="text-2xl font-bold text-[#4A0E36] mt-1 tabular-nums">
              {data.donationStats.verified_count}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500 font-medium">Awaiting Manual Verification</div>
            <div className="text-2xl font-bold text-[#F38B1C] mt-1 tabular-nums">
              {data.donationStats.pending_verification_count}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#4A0E36] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#4A0E36]">Donation Processing Entitlement Locked</div>
              <div className="text-xs text-stone-600">
                Online payment statistics will appear automatically once the developer enables the advanced donation entitlement.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Submissions + Recent Administrative Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-semibold text-[#4A0E36]">Recent Submissions</h2>
            <button
              type="button"
              onClick={() => onNavigateModule('contact')}
              className="text-xs font-semibold text-[#0E7C7B] hover:underline inline-flex items-center gap-1"
            >
              <span>Review All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {data.recentSubmissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              No contact, volunteer, or partnership submissions have been received yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {data.recentSubmissions.map((sub) => (
                <div key={`${sub.kind}-${sub.id}`} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{sub.title}</div>
                    <div className="text-xs text-stone-500 truncate">
                      <span className="capitalize">{sub.kind}</span> · {sub.email}
                      {sub.detail ? ` · ${sub.detail}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-[#0E7C7B] capitalize">{sub.status}</div>
                    <div className="text-[11px] text-stone-400 tabular-nums">{formatDateShort(sub.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200">
            <h2 className="font-semibold text-[#4A0E36]">Recent Administrative Activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">No administrative changes logged yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-800 truncate">
                      {act.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {act.admin_email || 'System'} · {act.module}
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-400 tabular-nums shrink-0">
                    {formatDateShort(act.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
