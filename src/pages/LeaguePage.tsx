import { useState } from "react";
import { leagueMembers } from "@/lib/mockData";
import LeaderboardRow from "@/components/LeaderboardRow";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const LeaguePage = () => {
  const [activeTab, setActiveTab] = useState<'tabla' | 'miembros'>('tabla');
  const currentUserId = 'u2'; // Mock current user

  const sorted = [...leagueMembers].sort((a, b) => b.points_total - a.points_total);

  return (
    <div className="min-h-screen pb-20">
      <TopBar />

      <main className="max-w-lg mx-auto">
        {/* League header */}
        <div className="bg-navy text-primary-foreground px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Quiniela Familia García</h2>
              <p className="text-xs opacity-60">{leagueMembers.length} miembros · Clausura 2026</p>
            </div>
            <button className="text-xl p-2 hover:bg-white/10 rounded-full transition-colors">📤</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card">
          {(['tabla', 'miembros'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-electric-blue border-b-2 border-electric-blue'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'tabla' ? '📊 Tabla' : '👥 Miembros'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'tabla' ? (
          <div className="bg-card">
            {sorted.map((member, i) => (
              <LeaderboardRow
                key={member.user_id}
                rank={i + 1}
                member={member}
                isCurrentUser={member.user_id === currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {leagueMembers.map(member => (
              <div key={member.user_id} className="flex items-center gap-3 bg-card p-3 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-soft-gray flex items-center justify-center text-xl">
                  {member.avatar_emoji}
                </div>
                <div>
                  <p className="font-semibold text-sm">{member.display_name}</p>
                  <p className="text-xs text-muted-foreground">{member.points_total} puntos totales</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LeaguePage;
