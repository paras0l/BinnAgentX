import type { ThemeDefinition, ThemeTier } from "./contracts";

export const THEME_TIERS: Record<
  ThemeTier,
  { label: string; rank: number; description: string; effects: readonly string[] }
> = {
  standard: {
    label: "基础",
    rank: 1,
    description: "替换核心色板与基础表面。",
    effects: [
      "统一替换主题色、页面背景、卡片和边界。",
      "按钮、输入框与状态提示使用同一套配色。",
      "保持通用布局，不启用角色插画和专属装饰。",
    ],
  },
  epic: {
    label: "史诗",
    rank: 2,
    description: "增加主题材质、标题语言与图标底座。",
    effects: [
      "包含基础等级的全部换肤效果。",
      "增加环境纹理、层次光影和主题氛围。",
      "启用专属标题处理与图标底座。",
      "保持通用布局，不启用角色插画。",
    ],
  },
  legendary: {
    label: "传说",
    rank: 3,
    description: "包含专属布局、插画、装饰资产与完整表现层。",
    effects: [
      "包含史诗等级的全部表现效果。",
      "可启用皮肤专属页面布局和角色安全区。",
      "使用专属角色插画、图标、装饰与隐藏彩蛋。",
      "支持增强转场和重点视觉资产预加载。",
    ],
  },
  collector: {
    label: "典藏",
    rank: 4,
    description: "在传说之上重塑组件、陪伴场景与完整主题图鉴。",
    effects: [
      "包含传说等级的全部布局、插画和动效能力。",
      "可替换按钮、标签、空状态和数据组件的完整外观。",
      "提供多场景角色陪伴、道具和页面级环境叙事。",
      "包含可展开的皮肤图鉴与素材彩蛋。",
      "可启用标题粒子成形与主题化指针轨迹。",
    ],
  },
};

export const THEME_REGISTRY = {
  paper: {
    id: "paper",
    label: "纸上专注",
    description: "米白纸张与森林绿，适合长时间阅读。",
    colorScheme: "light",
    tier: "standard",
    capabilities: ["palette", "surfaces"],
    preview: {
      canvas: "#f7f4ec",
      rail: "#e9ebe6",
      accent: "#376e53",
      surface: "#ffffff",
    },
    assets: {},
  },
  ragdoll: {
    id: "ragdoll",
    label: "布偶猫陪伴",
    description: "奶油粉彩、轻拟物纸张与安静的布偶猫伙伴。",
    colorScheme: "light",
    tier: "legendary",
    capabilities: [
      "palette",
      "surfaces",
      "typography",
      "icon-frames",
      "ambient",
      "decorations",
      "hero-art",
      "layout-variant",
      "enhanced-motion",
    ],
    preview: {
      canvas: "#fff8f5",
      rail: "#f5dce6",
      accent: "#a64e74",
      surface: "#fffdfc",
    },
    assets: {
      hero: {
        src: "/themes/ragdoll/hero.webp",
        width: 1440,
        height: 810,
        preload: true,
        mimeType: "image/webp",
        fit: "cover",
        position: "right -28px center",
      },
      "sidebar-ornament": {
        src: "/themes/ragdoll/paw.svg",
        width: 32,
        height: 32,
        mimeType: "image/svg+xml",
      },
      "hero-accent": {
        src: "/themes/ragdoll/sparkle.svg",
        width: 36,
        height: 36,
        mimeType: "image/svg+xml",
      },
      "history-easter-egg": {
        src: "/themes/ragdoll/paw.svg",
        width: 36,
        height: 36,
        mimeType: "image/svg+xml",
      },
    },
  },
  ocean: {
    id: "ocean",
    label: "海盐晨雾",
    description: "雾蓝与海盐绿，降低暖色刺激。",
    colorScheme: "light",
    tier: "epic",
    capabilities: ["palette", "surfaces", "typography", "icon-frames", "ambient"],
    preview: {
      canvas: "#eff8f8",
      rail: "#d3e7e7",
      accent: "#2f7178",
      surface: "#fbfefe",
    },
    assets: {},
  },
  "seal-summer": {
    id: "seal-summer",
    label: "海豹夏日乐园",
    description: "海浪、珊瑚与阳光构成的治愈夏日陪伴主题。",
    colorScheme: "light",
    tier: "collector",
    capabilities: [
      "palette",
      "surfaces",
      "typography",
      "icon-frames",
      "ambient",
      "decorations",
      "hero-art",
      "layout-variant",
      "component-skins",
      "companion-scenes",
      "artbook",
      "particle-headings",
      "pointer-trail",
      "enhanced-motion",
    ],
    preview: {
      canvas: "#eef9ff",
      rail: "#cfeeff",
      accent: "#4baef1",
      surface: "#fffef4",
    },
    assets: {
      ambient: {
        src: "/themes/seal-summer/ambient.jpg",
        width: 1672,
        height: 941,
        mimeType: "image/jpeg",
        fit: "cover",
        position: "center",
      },
      hero: {
        src: "/themes/seal-summer/hero.jpg",
        width: 1440,
        height: 810,
        preload: true,
        mimeType: "image/jpeg",
        fit: "cover",
        position: "center",
      },
      "sidebar-ornament": {
        src: "/themes/seal-summer/sidebar-companion.png",
        width: 640,
        height: 404,
        mimeType: "image/png",
      },
      "hero-accent": {
        src: "/themes/seal-summer/card-corner-decor.png",
        width: 574,
        height: 640,
        mimeType: "image/png",
      },
      "history-easter-egg": {
        src: "/themes/seal-summer/card-corner-decor.png",
        width: 574,
        height: 640,
        mimeType: "image/png",
      },
      "companion-atlas": {
        src: "/themes/seal-summer/character-atlas.jpg",
        width: 1448,
        height: 1086,
        mimeType: "image/jpeg",
      },
      "ui-library": {
        src: "/themes/seal-summer/ui-library.jpg",
        width: 1448,
        height: 1086,
        mimeType: "image/jpeg",
      },
      "concept-sheet": {
        src: "/themes/seal-summer/concept-sheet.jpg",
        width: 1448,
        height: 1086,
        mimeType: "image/jpeg",
      },
      "usage-guide": {
        src: "/themes/seal-summer/usage-guide.jpg",
        width: 1055,
        height: 1491,
        mimeType: "image/jpeg",
      },
      "empty-state-illustration": {
        src: "/themes/seal-summer/assets-empty-companion.png",
        width: 640,
        height: 430,
        mimeType: "image/png",
      },
      "profile-companion": {
        src: "/themes/seal-summer/profile-companion.png",
        width: 640,
        height: 356,
        mimeType: "image/png",
      },
      "preferences-companion": {
        src: "/themes/seal-summer/preferences-companion.png",
        width: 616,
        height: 640,
        mimeType: "image/png",
      },
      "workspace-companion": {
        src: "/themes/seal-summer/workspace-companion.png",
        width: 640,
        height: 515,
        mimeType: "image/png",
      },
      "milestone-companion": {
        src: "/themes/seal-summer/milestone-companion.png",
        width: 640,
        height: 515,
        mimeType: "image/png",
      },
      "card-corner-decor": {
        src: "/themes/seal-summer/card-corner-decor.png",
        width: 574,
        height: 640,
        mimeType: "image/png",
      },
    },
  },
} as const satisfies Record<string, ThemeDefinition>;

export type ThemeId = keyof typeof THEME_REGISTRY;

export const THEME_LIST = [...Object.values(THEME_REGISTRY)].sort(
  (left, right) => THEME_TIERS[left.tier].rank - THEME_TIERS[right.tier].rank,
);

export const THEME_IDS = Object.keys(THEME_REGISTRY) as ThemeId[];

export function normalizeThemeId(value: unknown): ThemeId {
  if (value === "sakura") return "ragdoll";
  return typeof value === "string" && value in THEME_REGISTRY ? (value as ThemeId) : "paper";
}

export function getThemeDefinition(value: unknown): ThemeDefinition<ThemeId> {
  return THEME_REGISTRY[normalizeThemeId(value)];
}
