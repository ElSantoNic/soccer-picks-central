export interface Match {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  result_1x2: '1' | 'X' | '2' | null;
}

export interface Jornada {
  jornada_id: string;
  season: string;
  jornada_number: number;
  status: 'open' | 'locked' | 'complete';
}


export const TEAM_COLORS: Record<string, string> = {
  'América': '#FFD700',
  'Guadalajara': '#CD2E3A',
  'Cruz Azul': '#0047AB',
  'Pumas UNAM': '#003366',
  'Tigres UANL': '#FFB800',
  'Monterrey': '#003DA5',
  'Santos Laguna': '#00843D',
  'León': '#008C45',
  'Toluca': '#8B0000',
  'Atlas': '#C8102E',
  'Pachuca': '#003B7B',
  'Necaxa': '#E8112D',
  'Puebla': '#2B4C96',
  'Querétaro': '#00205B',
  'Mazatlán': '#6B2D8B',
  'Tijuana': '#C8102E',
  'San Luis': '#C41E3A',
  'Juárez': '#006B3F',
};

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

export const currentJornada: Jornada = {
  jornada_id: 'j-10',
  season: 'Clausura 2026',
  jornada_number: 10,
  status: 'open',
};

export const openMatches: Match[] = [
  { match_id: 'm1', home_team: 'América', away_team: 'Guadalajara', kickoff_utc: yesterday.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm2', home_team: 'Cruz Azul', away_team: 'Pumas UNAM', kickoff_utc: tomorrow.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm3', home_team: 'Tigres UANL', away_team: 'Monterrey', kickoff_utc: tomorrow.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm4', home_team: 'Santos Laguna', away_team: 'León', kickoff_utc: tomorrow.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm5', home_team: 'Toluca', away_team: 'Atlas', kickoff_utc: dayAfter.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm6', home_team: 'Pachuca', away_team: 'Necaxa', kickoff_utc: dayAfter.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm7', home_team: 'Puebla', away_team: 'Querétaro', kickoff_utc: dayAfter.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm8', home_team: 'Mazatlán', away_team: 'Tijuana', kickoff_utc: dayAfter.toISOString(), home_score: null, away_score: null, result_1x2: null },
  { match_id: 'm9', home_team: 'San Luis', away_team: 'Juárez', kickoff_utc: dayAfter.toISOString(), home_score: null, away_score: null, result_1x2: null },
];

export const completedJornada: Jornada = {
  jornada_id: 'j-9',
  season: 'Clausura 2026',
  jornada_number: 9,
  status: 'complete',
};

export const completedMatches: (Match & { userPick: '1' | 'X' | '2' | null; isCorrect: boolean })[] = [
  { match_id: 'c1', home_team: 'Guadalajara', away_team: 'América', kickoff_utc: '', home_score: 2, away_score: 1, result_1x2: '1', userPick: '1', isCorrect: true },
  { match_id: 'c2', home_team: 'Pumas UNAM', away_team: 'Cruz Azul', kickoff_utc: '', home_score: 0, away_score: 0, result_1x2: 'X', userPick: 'X', isCorrect: true },
  { match_id: 'c3', home_team: 'Monterrey', away_team: 'Tigres UANL', kickoff_utc: '', home_score: 1, away_score: 3, result_1x2: '2', userPick: '1', isCorrect: false },
  { match_id: 'c4', home_team: 'León', away_team: 'Santos Laguna', kickoff_utc: '', home_score: 2, away_score: 0, result_1x2: '1', userPick: '1', isCorrect: true },
  { match_id: 'c5', home_team: 'Atlas', away_team: 'Toluca', kickoff_utc: '', home_score: 1, away_score: 1, result_1x2: 'X', userPick: '2', isCorrect: false },
  { match_id: 'c6', home_team: 'Necaxa', away_team: 'Pachuca', kickoff_utc: '', home_score: 0, away_score: 2, result_1x2: '2', userPick: '2', isCorrect: true },
  { match_id: 'c7', home_team: 'Querétaro', away_team: 'Puebla', kickoff_utc: '', home_score: 3, away_score: 1, result_1x2: '1', userPick: '2', isCorrect: false },
  { match_id: 'c8', home_team: 'Tijuana', away_team: 'Mazatlán', kickoff_utc: '', home_score: 1, away_score: 0, result_1x2: '1', userPick: '1', isCorrect: true },
  { match_id: 'c9', home_team: 'Juárez', away_team: 'San Luis', kickoff_utc: '', home_score: 2, away_score: 2, result_1x2: 'X', userPick: '1', isCorrect: false },
];

export const leagueMembers: LeagueMember[] = [
  { user_id: 'u1', display_name: 'Carlos', avatar_emoji: '🦅', points_jornada: 7, points_total: 52, badges: ['⚽', '🔥'] },
  { user_id: 'u2', display_name: 'Ana', avatar_emoji: '🌮', points_jornada: 6, points_total: 48, badges: ['⚽'] },
  { user_id: 'u3', display_name: 'Roberto', avatar_emoji: '⚽', points_jornada: 8, points_total: 45, badges: ['⚽', '⭐', '🔥'] },
  { user_id: 'u4', display_name: 'María', avatar_emoji: '🎉', points_jornada: 5, points_total: 43, badges: [] },
  { user_id: 'u5', display_name: 'Juan', avatar_emoji: '🏆', points_jornada: 4, points_total: 39, badges: ['⚽'] },
  { user_id: 'u6', display_name: 'Sofía', avatar_emoji: '💃', points_jornada: 6, points_total: 37, badges: ['🔥'] },
  { user_id: 'u7', display_name: 'Pedro', avatar_emoji: '🎸', points_jornada: 3, points_total: 35, badges: [] },
  { user_id: 'u8', display_name: 'Lupita', avatar_emoji: '🌺', points_jornada: 5, points_total: 31, badges: ['⚽'] },
];

export const BADGE_DEFINITIONS = [
  { type: 'debut', emoji: '⚽', name: 'Debut Quinielero', description: 'Hiciste tus primeros picks' },
  { type: 'racha3', emoji: '🔥', name: 'Racha x3', description: 'Picks a tiempo 3 jornadas seguidas' },
  { type: 'racha5', emoji: '🔥🔥', name: 'Racha x5', description: 'Picks a tiempo 5 jornadas seguidas' },
  { type: 'perfecta', emoji: '⭐', name: 'Jornada Perfecta', description: '9 de 9 correctos' },
  { type: 'organizador', emoji: '🤝', name: 'El Organizador', description: 'Invitaste a 3+ personas' },
  { type: 'campeon', emoji: '🏆', name: 'Campeón', description: 'Primer lugar en una liga' },
];
