import { useEffect } from "react";
import { useConfigStore } from "../store/configStore";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLORS = { light: "#ffffff", dark: "#121212" };

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

// Keeps the <html> "dark" class in sync with the theme setting, following the
// OS preference live when the setting is "system".
export function useTheme() {
  const theme = useConfigStore((s) => s.theme);

  useEffect(() => {
    if (theme !== "system") {
      apply(theme === "dark");
      return;
    }
    const mql = window.matchMedia(DARK_QUERY);
    apply(mql.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);
}
