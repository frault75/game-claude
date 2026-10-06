export interface Palette {
  paper: string;
  ink: string;
  a: string;
  b: string;
}

export const VERMILION_HEX = '#C23A2B';

export const PALETTES: Record<string, Palette> = {
  storm: { paper: '#E8E2D0', ink: '#15171C', a: '#4A6A8A', b: '#D9A441' },
  orchard: { paper: '#EEE5CF', ink: '#2A2420', a: '#D7A3A0', b: '#A9B58C' },
  river: { paper: '#E4E0CE', ink: '#1B2228', a: '#3F5F82', b: '#D9B56A' },
  hills: { paper: '#EAD9B8', ink: '#2B1E18', a: '#D08C3A', b: '#8E4A2E' },
  studio: { paper: '#F2F1EC', ink: '#191C23', a: '#98A6B6', b: '#B7AB98' },
  blank: { paper: '#F7F3E9', ink: '#8E8B85', a: '#B9B5AE', b: '#CFCBC3' },
  /** The blank page once restored: true ink returns. */
  blankInked: { paper: '#F7F3E9', ink: '#141414', a: '#D7A3A0', b: '#3F5F82' },
};
