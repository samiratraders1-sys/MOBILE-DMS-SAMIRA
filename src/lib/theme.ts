export interface ThemePalette {
  name: string;
  id: string;
  colors: {
    50: string;
    100: string;
    200: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    name: "Classic Indigo (ডিফল্ট)",
    id: "default",
    colors: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#1e1b4b",
    },
  },
  {
    name: "Samira Blue (ব্লু)",
    id: "blue",
    colors: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
  },
  {
    name: "Emerald Green (সবুজ)",
    id: "emerald",
    colors: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },
  },
  {
    name: "Slate Dark (ডার্ক)",
    id: "slate",
    colors: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
  },
];

export function applyThemePalette(paletteId: string) {
  const palette = THEME_PALETTES.find((p) => p.id === paletteId) || THEME_PALETTES[0];
  const root = document.documentElement;
  
  Object.entries(palette.colors).forEach(([key, value]) => {
    root.style.setProperty(`--primary-${key}`, value);
  });
  
  localStorage.setItem("brand-palette", palette.id);
}
