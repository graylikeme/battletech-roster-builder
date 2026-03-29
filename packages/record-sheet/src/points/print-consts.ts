/**
 * Print constants ported from SSW's PrintConsts.java.
 * Defines font sizes, pip dimensions, and rendering constants.
 *
 * SSW uses EurostileLTStd and LiberationSans custom fonts.
 * In jsPDF we use Helvetica (closest standard match to Eurostile)
 * and Courier for monospace needs.
 */

// Font sizes -- SSW uses Eurostile which is ~15-20% narrower than Helvetica.
// All sizes reduced accordingly to prevent text overflow.
export const FONTS = {
  designName:   { family: 'helvetica', style: 'bold',   size: 8 },
  crit:         { family: 'helvetica', style: 'bold',   size: 5 },
  nonCrit:      { family: 'helvetica', style: 'normal', size: 5 },
  bold:         { family: 'helvetica', style: 'bold',   size: 8 },
  plain:        { family: 'helvetica', style: 'normal', size: 7 },
  regular:      { family: 'helvetica', style: 'normal', size: 8 },
  small8:       { family: 'helvetica', style: 'normal', size: 6.5 },
  small:        { family: 'helvetica', style: 'normal', size: 6 },
  smallBold:    { family: 'helvetica', style: 'bold',   size: 6 },
  reallySmall:  { family: 'helvetica', style: 'normal', size: 5 },
  xtraSmall:    { family: 'helvetica', style: 'normal', size: 5 },
  xtraSmallBold:{ family: 'helvetica', style: 'bold',   size: 5 },
  tiny:         { family: 'helvetica', style: 'normal', size: 4.5 },
  crazyTiny:    { family: 'helvetica', style: 'normal', size: 3.5 },
} as const;

export type FontDef = typeof FONTS[keyof typeof FONTS];

// Pip rendering constants
export const PIP = {
  /** Armor/structure pip diameter -- SSW non-canon uses 5, but canon GIFs use ~6.
   *  We use 6 to better match the canonical record sheet appearance. */
  size: 6,
  /** Heat sink pip diameter */
  heatSinkSize: 7,
  /** Stroke width for pip outlines */
  strokeWidth: 1.0,
  /** Spacing between heat sink pips */
  heatSinkSpacer: 2,
} as const;

// Canvas dimensions (SSW rendering coordinate space)
export const CANVAS = {
  width: 576,
  height: 756,
} as const;

// Data field indices into BIPED_POINTS.data[]
export const DATA = {
  MECH_NAME: 0,
  WALK_MP: 1,
  RUN_MP: 2,
  JUMP_MP: 3,
  TONNAGE: 4,
  TECH_CLAN: 5,
  TECH_IS: 6,
  PILOT_NAME: 7,
  PILOT_GUN: 8,
  PILOT_PILOT: 9,
  COST: 10,
  BV2: 11,
  HEATSINK_NUMBER: 12,
  HEATSINK_DISSIPATION: 13,
  MAX_HEAT: 16,
  TOTAL_ARMOR: 17,
  AMMO_COSTS: 21,
} as const;

// Weapon table column indices into BIPED_POINTS.weapons[]
export const WEAPON_COLS = {
  COUNT: 0,
  NAME: 1,
  LOCATION: 2,
  HEAT: 3,
  DAMAGE: 4,
  MIN: 5,
  SHORT: 6,
  MEDIUM: 7,
  LONG: 8,
} as const;

// Location abbreviations for display
export const LOCATION_ABBREV: Record<string, string> = {
  head: 'HD',
  center_torso: 'CT',
  left_torso: 'LT',
  right_torso: 'RT',
  left_arm: 'LA',
  right_arm: 'RA',
  left_leg: 'LL',
  right_leg: 'RL',
};
