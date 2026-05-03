import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, AlertCircle, Loader2, Plus, RefreshCw, CalendarDays, Volleyball, Building2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

type TabType = 'jornada' | 'schedule' | 'results' | 'dashboard';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const tabs: { key: TabType; label: string }[] = [
    { key: 'jornada', label: 'Jornada Manager' },
    { key: 'schedule', label: 'Schedule Upload' },
    { key: 'results', label: 'Results Upload' },
    { key: 'dashboard', label: 'Dashboard' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border h-14 flex items-center px-4">
        <h1 className="text-lg font-bold text-foreground">FC Quiniela — Admin</h1>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'jornada' && <JornadaManager />}
        {activeTab === 'schedule' && <ScheduleUpload />}
        {activeTab === 'results' && <ResultsUpload />}
        {activeTab === 'dashboard' && <DashboardPanel />}
      </div>
    </div>
  );
};

// ─── Jornada Manager ──────────────────────────────────────────
const JornadaManager = () => {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNumber, setNewNumber] = useState('');
  const [newSeason, setNewSeason] = useState('Clausura 2026');
  const [newStage, setNewStage] = useState<'regular' | 'cuartos' | 'semifinal' | 'final'>('regular');
  const [newLeg, setNewLeg] = useState<'single' | 'ida' | 'vuelta'>('single');

  const fetchJornadas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('jornadas')
      .select('*')
      .order('jornada_number', { ascending: false });
    setJornadas(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJornadas(); }, [fetchJornadas]);

  const createJornada = async () => {
    if (!newNumber) return;
    const { error: lockError } = await supabase
      .from('jornadas')
      .update({ status: 'locked' })
      .eq('status', 'open');
    if (lockError) {
      toast.error('Failed to lock previous jornadas: ' + lockError.message);
      return;
    }
    const { error } = await supabase.from('jornadas').insert({
      jornada_number: parseInt(newNumber),
      season: newSeason,
      status: 'open',
      stage: newStage,
      leg: newLeg,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Jornada ${newNumber} created (previous open jornadas locked)`);
      setNewNumber('');
      fetchJornadas();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('jornadas').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else fetchJornadas();
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Jornada Manager</h2>

      <div className="flex gap-2 items-end mb-6 p-4 bg-card rounded-lg border border-border">
        <div>
      <div className="flex flex-wrap gap-2 items-end mb-6 p-4 bg-card rounded-lg border border-border">
        <div>
          <label className="text-xs font-medium block mb-1">Season</label>
          <input
            value={newSeason}
            onChange={e => setNewSeason(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm w-40"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Jornada #</label>
          <input
            type="number"
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm w-20"
            min={1}
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Stage</label>
          <select
            value={newStage}
            onChange={e => setNewStage(e.target.value as any)}
            className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="regular">Regular</option>
            <option value="cuartos">Cuartos</option>
            <option value="semifinal">Semifinal</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Leg</label>
          <select
            value={newLeg}
            onChange={e => setNewLeg(e.target.value as any)}
            className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="single">Single</option>
            <option value="ida">Ida</option>
            <option value="vuelta">Vuelta</option>
          </select>
        </div>
        <button
          onClick={createJornada}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {jornadas.map(j => (
            <div key={j.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
              <div>
                <span className="font-semibold">Jornada {j.jornada_number}</span>
                <span className="text-xs text-muted-foreground ml-2">{j.season}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={j.status}
                  onChange={e => updateStatus(j.id, e.target.value)}
                  className="text-xs rounded-md border border-input bg-background px-2 py-1"
                >
                  <option value="open">Open</option>
                  <option value="locked">Locked</option>
                  <option value="complete">Complete</option>
                </select>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  j.status === 'open' ? 'bg-success/10 text-success' :
                  j.status === 'locked' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>{j.status}</span>
              </div>
            </div>
          ))}
          {jornadas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No jornadas yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Schedule Upload ──────────────────────────────────────────
const ScheduleUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; summary: string; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setResult(null);

    try {
      const { data: teamsData } = await supabase.from('teams').select('name');
      const validTeams = new Set((teamsData || []).map(t => t.name));

      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const matchIdIdx = header.findIndex(h => h === 'match_id');
      const jornadaIdx = header.findIndex(h => h.includes('jornada'));
      const homeIdx = header.findIndex(h => h.includes('home'));
      const awayIdx = header.findIndex(h => h.includes('away') || h.includes('visit'));
      const kickoffIdx = header.findIndex(h => h.includes('kickoff') || h.includes('date') || h.includes('fecha'));

      if (homeIdx === -1 || awayIdx === -1 || kickoffIdx === -1) {
        throw new Error('CSV must contain columns: home_team, away_team, kickoff_utc (or fecha/date)');
      }

      const errors: string[] = [];
      const rows: { match_id_csv: string; jornada_number: number; home_team: string; away_team: string; kickoff_utc: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim());

        const home = cols[homeIdx];
        const away = cols[awayIdx];
        const kickoff = cols[kickoffIdx];
        const matchId = matchIdIdx !== -1 ? cols[matchIdIdx] : `m${i}`;
        const jornadaNum = jornadaIdx !== -1 ? parseInt(cols[jornadaIdx]) : 0;

        if (!validTeams.has(home)) {
          errors.push(`Row ${i + 1}: team "${home}" not in DB (check teams table)`);
        }
        if (!validTeams.has(away)) {
          errors.push(`Row ${i + 1}: team "${away}" not in DB (check teams table)`);
        }

        const parsedDate = new Date(kickoff);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${i + 1}: invalid date "${kickoff}"`);
        }

        if (errors.length === 0) {
          rows.push({
            match_id_csv: matchId,
            jornada_number: jornadaNum,
            home_team: home,
            away_team: away,
            kickoff_utc: parsedDate.toISOString(),
          });
        }
      }

      if (errors.length > 0) {
        setResult({ success: false, summary: `${errors.length} validation error(s)`, errors });
        setIsUploading(false);
        return;
      }

      const jornadaNumbers = [...new Set(rows.map(r => r.jornada_number))];

      for (const num of jornadaNumbers) {
        const { data: existing } = await supabase
          .from('jornadas')
          .select('id')
          .eq('jornada_number', num)
          .maybeSingle();

        if (!existing) {
          await supabase.from('jornadas').insert({ jornada_number: num, status: 'open' });
        }
      }

      const { data: jornadaData } = await supabase
        .from('jornadas')
        .select('id, jornada_number')
        .in('jornada_number', jornadaNumbers);

      const jornadaMap = new Map((jornadaData || []).map(j => [j.jornada_number, j.id]));

      const matchInserts = rows.map(r => ({
        match_id_csv: r.match_id_csv,
        jornada_id: jornadaMap.get(r.jornada_number)!,
        home_team: r.home_team,
        away_team: r.away_team,
        kickoff_utc: r.kickoff_utc,
      }));

      const { error: insertError } = await supabase.from('matches').upsert(matchInserts, { onConflict: 'match_id_csv' });

      if (insertError) throw new Error(insertError.message);

      setResult({
        success: true,
        summary: `${rows.length} matches imported for Jornada ${jornadaNumbers.join(', ')}`,
        errors: [],
      });
    } catch (err: any) {
      setResult({ success: false, summary: err.message, errors: [] });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Schedule Upload</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Upload <code>match_schedule.csv</code> with the columns shown below.
      </p>

      <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-xs font-semibold text-foreground mb-2">Required columns</p>
        <code className="block text-xs text-foreground mb-3">match_id, jornada_number, home_team, away_team, kickoff_utc</code>
        <p className="text-xs font-semibold text-foreground mb-1">Example</p>
        <pre className="text-xs text-muted-foreground bg-background border border-border rounded p-2 overflow-x-auto">{`match_id,jornada_number,home_team,away_team,kickoff_utc
MX-2026-J15-01,15,América,Chivas,2026-04-21T02:00:00Z
MX-2026-J15-02,15,Cruz Azul,Pumas,2026-04-21T04:00:00Z`}</pre>
        <ul className="mt-3 text-xs text-muted-foreground space-y-1">
          <li>• <code>home_team</code> / <code>away_team</code> must match names in the <code>teams</code> table exactly</li>
          <li>• <code>kickoff_utc</code> in ISO 8601 UTC format</li>
          <li>• <code>match_id</code> is the stable ID used later in Results Upload (case-sensitive)</li>
        </ul>
      </div>

      <CSVDropZone onFile={handleFile} isUploading={isUploading} />

      {result && (
        <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center gap-2 mb-1">
            {result.success ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
            <span className={`font-semibold text-sm ${result.success ? 'text-success' : 'text-destructive'}`}>{result.summary}</span>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-destructive">• {e}</li>
              ))}
            </ul>
          )}
          {!result.success && (
            <button onClick={() => setResult(null)} className="mt-3 text-xs font-medium text-primary hover:underline">
              Upload Another File
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Results Upload ──────────────────────────────────────────
const ResultsUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; summary: string; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must have a header and data rows');

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const matchIdIdx = header.findIndex(h => h === 'match_id');
      const homeScoreIdx = header.findIndex(h => h.includes('home_score') || h.includes('home score'));
      const awayScoreIdx = header.findIndex(h => h.includes('away_score') || h.includes('away score'));

      if (matchIdIdx === -1 || homeScoreIdx === -1 || awayScoreIdx === -1) {
        throw new Error('CSV must contain columns: match_id, home_score, away_score');
      }

      let updated = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim());

        const matchId = cols[matchIdIdx];
        const homeScore = parseInt(cols[homeScoreIdx]);
        const awayScore = parseInt(cols[awayScoreIdx]);

        if (isNaN(homeScore) || isNaN(awayScore)) {
          errors.push(`Row ${i + 1}: invalid score values`);
          continue;
        }

        const result_1x2 = homeScore > awayScore ? '1' : homeScore < awayScore ? '2' : 'X';

        const { error } = await supabase
          .from('matches')
          .update({ home_score: homeScore, away_score: awayScore, result_1x2 })
          .eq('match_id_csv', matchId);

        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          updated++;
        }
      }

      setResult({
        success: errors.length === 0,
        summary: errors.length === 0
          ? `${updated} match results updated successfully`
          : `${updated} updated, ${errors.length} error(s)`,
        errors,
      });
    } catch (err: any) {
      setResult({ success: false, summary: err.message, errors: [] });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Results Upload</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Upload <code>match_results.csv</code> with the columns shown below.
      </p>

      <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-xs font-semibold text-foreground mb-2">Required columns</p>
        <code className="block text-xs text-foreground mb-3">match_id, home_score, away_score</code>
        <p className="text-xs font-semibold text-foreground mb-1">Example</p>
        <pre className="text-xs text-muted-foreground bg-background border border-border rounded p-2 overflow-x-auto">{`match_id,home_score,away_score
MX-2026-J15-01,2,1
MX-2026-J15-02,0,0
MX-2026-J15-03,1,3`}</pre>
        <ul className="mt-3 text-xs text-muted-foreground space-y-1">
          <li>• <code>match_id</code> must match the IDs from your Schedule Upload (case-sensitive)</li>
          <li>• Scores are whole numbers; ties are allowed</li>
          <li>• Result (1 / X / 2) is computed automatically from the scores</li>
        </ul>
      </div>

      <CSVDropZone onFile={handleFile} isUploading={isUploading} />
      {result && (
        <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className="flex items-center gap-2 mb-1">
            {result.success ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
            <span className={`font-semibold text-sm ${result.success ? 'text-success' : 'text-destructive'}`}>{result.summary}</span>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-destructive">• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Dashboard ──────────────────────────────────────────
const DashboardPanel = () => {
  const [stats, setStats] = useState({ jornadas: 0, matches: 0, teams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [j, m, t] = await Promise.all([
        supabase.from('jornadas').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        jornadas: j.count || 0,
        matches: m.count || 0,
        teams: t.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const cards: { label: string; value: number; Icon: LucideIcon }[] = [
    { label: 'Jornadas', value: stats.jornadas, Icon: CalendarDays },
    { label: 'Matches', value: stats.matches, Icon: Volleyball },
    { label: 'Teams', value: stats.teams, Icon: Building2 },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(c => {
          const Icon = c.Icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-lg p-4 text-center">
              <Icon size={24} strokeWidth={2.25} className="text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Shared CSV Drop Zone ──────────────────────────────────────────
const CSVDropZone = ({ onFile, isUploading }: { onFile: (f: File) => void; isUploading: boolean }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Processing...</p>
        </div>
      ) : (
        <label className="cursor-pointer">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Supports .csv files</p>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
      )}
    </div>
  );
};

export default AdminPage;
