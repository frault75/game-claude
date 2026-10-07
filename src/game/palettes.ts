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
  cave: { paper: '#D9D1BD', ink: '#17130F', a: '#6E9A86', b: '#8A6A48' },
  temple: { paper: '#DCD8C8', ink: '#12181B', a: '#4F807B', b: '#C29A45' },
  // Act II
  terraces: { paper: '#EDE8D2', ink: '#1F2620', a: '#7FA36B', b: '#C9B26A' },
  bamboo: { paper: '#E6E6D3', ink: '#16201A', a: '#5E8C5A', b: '#A8B07A' },
  lake: { paper: '#E8E4D6', ink: '#18212A', a: '#D59AAE', b: '#5D86A0' },
  pass: { paper: '#E2E1DA', ink: '#1C1E22', a: '#8C98A8', b: '#B6A890' },
  pagoda: { paper: '#DED6C4', ink: '#15120F', a: '#B4473A', b: '#C8A24A' },
  cistern: { paper: '#D6D6C6', ink: '#111A18', a: '#5E8C7A', b: '#8C7C58' },
  /** The blank page once restored: true ink returns. */
  blankInked: { paper: '#F7F3E9', ink: '#141414', a: '#D7A3A0', b: '#3F5F82' },
};
