export interface StoredImage {
  index: number;
  url: string;
  originalName?: string;
}

export interface ResultData {
  id: string;
  createdAt: string;
  prompt: string;
  generatedOutput: string;
  images: StoredImage[];
}
