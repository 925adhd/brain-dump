
export interface Slide {
  title: string;
  bullets: string[];
  visualContent: string;
  spokenContent: string;
  speakerNotes: string;
  recommendedAsVisualOnly: boolean;
  imageUrl?: string; // Base64 or URL of the generated image
}

export interface Presentation {
  id: string;
  timestamp: number;
  title: string;
  summary: string;
  visualTheme: string; // The locked-in art style for the entire deck
  genericStyleDescription: string; // IP-neutral description of the style
  originalThoughtCount: number;
  slideCount: number;
  slides: Slide[];
  coverImageUrl?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  HISTORY = 'HISTORY'
}
