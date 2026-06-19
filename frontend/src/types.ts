export type SegmentType = "heading" | "paragraph" | "marker";

export interface Segment {
  idx: number;
  type: SegmentType;
  section: string | null;
  text: string;
}

export interface Session {
  current_segment: number;
  speed: number;
  voice_profile_id: string | null;
  finished: boolean;
}

export interface DocumentMeta {
  id: number;
  title: string;
  subtitle: string | null;
  source_kind: string;
  total_segments: number;
}

export interface DocumentOut {
  document: DocumentMeta;
  segments: Segment[];
  session: Session;
}

export interface RecentDoc {
  id: number;
  title: string;
  subtitle: string | null;
  source_kind: string;
  total_segments: number;
  current_segment: number;
  finished: boolean;
  pct: number;
}

export interface Voice {
  id: string;
  name: string;
  cloned: boolean;
}

export interface Health {
  backend: boolean;
  voicebox: boolean;
}
