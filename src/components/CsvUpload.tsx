import { useRef } from "react";
import { Upload } from "lucide-react";

interface CsvUploadProps {
  onMatchesLoaded: (matches: ParsedMatch[]) => void;
}

export interface ParsedMatch {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
}

const CsvUpload = ({ onMatchesLoaded }: CsvUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const homeIdx = header.findIndex(h => h.includes('home'));
      const awayIdx = header.findIndex(h => h.includes('away') || h.includes('visit'));
      const kickoffIdx = header.findIndex(h => h.includes('kickoff') || h.includes('date') || h.includes('fecha'));

      if (homeIdx === -1 || awayIdx === -1) {
        alert('CSV debe tener columnas: home_team, away_team, kickoff_utc (o fecha)');
        return;
      }

      const matches: ParsedMatch[] = lines.slice(1).filter(l => l.trim()).map((line, i) => {
        const cols = line.split(',').map(c => c.trim());
        return {
          match_id: `csv-${i}`,
          home_team: cols[homeIdx],
          away_team: cols[awayIdx],
          kickoff_utc: kickoffIdx !== -1 ? new Date(cols[kickoffIdx]).toISOString() : new Date().toISOString(),
        };
      });

      onMatchesLoaded(matches);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all"
    >
      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-semibold mb-1">Sube el calendario de partidos</p>
      <p className="text-xs text-muted-foreground">
        Archivo CSV con columnas: home_team, away_team, kickoff_utc
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

export default CsvUpload;
