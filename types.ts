
export interface ExtractedNumber {
  number: string;
  country: string;
}

export interface ExtractionResponse {
  numbers: ExtractedNumber[];
  summary: string;
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'error';
