// Small inline icon set (stroke icons matching the design language).
interface P { size?: number; color?: string; fill?: string; strokeWidth?: number }

const base = (size = 24) => ({
  width: size, height: size, viewBox: "0 0 24 24",
});

export const Upload = ({ size = 26, color = "var(--accent)" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const Chevron = ({ size = 13, color = "#a0a0ab", dir = "down" }: P & { dir?: "down" | "left" }) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    {dir === "down" ? <polyline points="6 9 12 15 18 9" /> : <polyline points="15 18 9 12 15 6" />}
  </svg>
);

export const Play = ({ size = 22, fill = "#fff" }: P) => (
  <svg {...base(size)} fill={fill}><polygon points="7 4 20 12 7 20 7 4" /></svg>
);

export const Pause = ({ size = 20, fill = "#fff" }: P) => (
  <svg {...base(size)} fill={fill}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);

export const Prev = ({ size = 20 }: P) => (
  <svg {...base(size)} fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
);

export const Next = ({ size = 20 }: P) => (
  <svg {...base(size)} fill="currentColor"><path d="M16 5h2v14h-2zM4 5l11 7-11 7z" /></svg>
);

export const Check = ({ size = 15, color = "#27a06a" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

export const Doc = ({ size = 18, color = "#8b8bd8" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" />
  </svg>
);

export const Warn = ({ size = 15, color = "#d9852b" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const Close = ({ size = 16, color = "currentColor" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const Mic = ({ size = 17, color = "currentColor" }: P) => (
  <svg {...base(size)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  </svg>
);

export const Spinner = ({ size = 17 }: P) => (
  <span style={{ width: size, height: size, border: "2.2px solid rgba(91,91,214,.25)", borderTopColor: "var(--accent)", borderRadius: "50%", display: "inline-block", animation: "dl-spin .7s linear infinite" }} />
);
