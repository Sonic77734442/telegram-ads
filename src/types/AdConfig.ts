export interface AdConfig {
  id: string;
  title: string;
  url: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  cpm: number;
  budget: number;
  dailyLimit: number;
  countries: string[];
  languages: string[];
  topics: string[];
  excludeTopics: string[];
  devices: string[];
  buttonText: string;
  status: "Active" | "Stopped";
  createdAt: string;
}
