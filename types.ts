
export enum AppMode {
  Chat = 'צ\'אט',
  Live = 'שיחה חיה',
  ImageCreate = 'יצירת תמונה',
  ImageEdit = 'עריכת תמונה',
  VideoCreate = 'יצירת וידאו',
}

export interface StoryPartText {
  type: 'text';
  content: string;
}
export interface StoryPartImage {
  type: 'image';
  prompt: string;
  url?: string;
  status: 'loading' | 'loaded' | 'error';
}

export type StoryPart = StoryPartText | StoryPartImage;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  storyParts?: StoryPart[];
}