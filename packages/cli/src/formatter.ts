import type { Roster } from '@bt-roster/core';
import { MISSION_PROFILES } from '@bt-roster/core';

export function formatRoster(roster: Roster): string {
  const profile = MISSION_PROFILES[roster.mission];
  const entries = roster.entries;

  if (entries.length === 0) return 'Empty roster — no units selected.';

  const nameW = Math.max(...entries.map(e => e.unit.fullName.length), 'Unit Name'.length);
  const variantW = Math.max(...entries.map(e => e.unit.variant.length), 'Variant'.length);
  const roleW = Math.max(...entries.map(e => (e.unit.role ?? '-').length), 'Role'.length);
  const numW = Math.max(String(entries.length).length, 1);
  const tonsW = 4;
  const pilotW = 5;
  const bvW = Math.max(...entries.map(e => String(e.baseBv).length), 4);
  const adjBvW = Math.max(...entries.map(e => String(e.adjustedBv).length), 6);

  function row(num: string, name: string, variant: string, tons: string, pilot: string, bv: string, adjBv: string, role: string): string {
    return ` ${num.padStart(numW)}  ${name.padEnd(nameW)}  ${variant.padEnd(variantW)}  ${tons.padStart(tonsW)}  ${pilot.padStart(pilotW)}  ${bv.padStart(bvW)}  ${adjBv.padStart(adjBvW)}  ${role.padEnd(roleW)}`;
  }

  const lines: string[] = [];

  lines.push(` BATTLETECH ROSTER — ${profile.name}`);

  const eraLabel = roster.era.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const headerParts = [`Era: ${eraLabel}`];
  if (roster.factionType) headerParts.push(`Faction: ${roster.factionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`);
  if (roster.factionSlug) headerParts.push(`(${roster.factionSlug})`);
  lines.push(` ${headerParts.join(' | ')}`);

  const pct = roster.bvBudget > 0 ? (roster.bvUsed / roster.bvBudget * 100).toFixed(1) : '0.0';
  lines.push(` BV Budget: ${roster.bvBudget} | BV Used: ${roster.bvUsed} (${pct}%) | Remaining: ${roster.bvRemaining}`);

  const headerRow = row('#', 'Unit Name', 'Variant', 'Tons', 'Pilot', 'BV', 'Adj BV', 'Role');
  const separator = ' ' + '─'.repeat(headerRow.length - 1);

  lines.push(separator);
  lines.push(headerRow);
  lines.push(separator);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    lines.push(row(
      String(i + 1),
      e.unit.fullName,
      e.unit.variant,
      String(Math.floor(e.unit.tonnage)),
      `${e.gunnery}/${e.piloting}`,
      String(e.baseBv),
      String(e.adjustedBv),
      e.unit.role ?? '-',
    ));
  }

  lines.push(separator);

  const totalTons = String(Math.floor(roster.totalTonnage));
  const totalBase = String(entries.reduce((s, e) => s + e.baseBv, 0));
  const totalAdj = String(roster.bvUsed);
  lines.push(row('', 'TOTAL', '', totalTons, '', totalBase, totalAdj, ''));

  return lines.join('\n');
}

export function formatMissionsList(): string {
  const lines = [' Available Missions:', ' ' + '─'.repeat(60)];
  for (const [id, profile] of Object.entries(MISSION_PROFILES)) {
    lines.push(`  ${id.padEnd(20)} ${profile.description}`);
  }
  return lines.join('\n');
}

export function formatErasList(eras: Array<{ slug: string; name: string }>): string {
  const lines = [' Available Eras:', ' ' + '─'.repeat(60)];
  for (const era of eras) {
    lines.push(`  ${era.slug.padEnd(30)} ${era.name}`);
  }
  return lines.join('\n');
}

export function formatFactionsList(factions: Array<{ slug: string; name: string; factionType: string; isClan: boolean }>): string {
  const lines = [' Available Factions:', ' ' + '─'.repeat(60)];
  for (const f of factions) {
    const clan = f.isClan ? ' (Clan)' : '';
    lines.push(`  ${f.slug.padEnd(30)} ${f.name.padEnd(30)} ${f.factionType}${clan}`);
  }
  return lines.join('\n');
}
