import { useEffect, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import * as UiKit from "@mfe-sols/ui-kit";
import * as I18n from "@mfe-sols/i18n";
import { createQueryClient } from "./mvp/service";
import { AppView } from "./mvp/view";

type AppLocale = "en" | "vi";

const ensureThemeToggle =
  typeof UiKit.ensureThemeToggle === "function" ? UiKit.ensureThemeToggle : () => null;
const getStoredLocale =
  (typeof I18n.getStoredLocale === "function"
    ? I18n.getStoredLocale
    : () => "en") as () => AppLocale;
const setLocale =
  (typeof I18n.setLocale === "function"
    ? I18n.setLocale
    : () => undefined) as (locale: AppLocale) => void;
const t =
  typeof I18n.t === "function" ? I18n.t : (key: string) => key;

const getThemeFromElement = (target: Element | null): "light" | "dark" =>
  target?.getAttribute("data-theme") === "dark" ? "dark" : "light";

export default function Root() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const themeCleanupRef = useRef<(() => void) | null>(null);
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return "en";
    const stored = getStoredLocale();
    setLocale(stored);
    return stored;
  });
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const applyLocale = (next: string) => {
      const normalized = next === "vi" ? "vi" : "en";
      setLocale(normalized);
      setLocaleState(normalized);
      document.documentElement.setAttribute("lang", normalized);
    };
    const onLocaleChange = (event: Event) => {
      const detail = (event as CustomEvent<{ locale?: string }>).detail;
      if (detail?.locale) applyLocale(detail.locale);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "app-locale") {
        applyLocale(getStoredLocale());
      }
    };
    window.addEventListener("app-locale-change", onLocaleChange);
    window.addEventListener("storage", onStorage);
    applyLocale(getStoredLocale());
    return () => {
      window.removeEventListener("app-locale-change", onLocaleChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const rootEl = rootRef.current as HTMLDivElement | null;
    if (!rootEl) return undefined;

    const shellRoot = document.documentElement;
    const sharedKey = "ds-theme";
    const legacyKey = "ds-theme:mfe-hero-discovery";

    const readStoredTheme = (): "light" | "dark" | null => {
      try {
        const shared = window.localStorage.getItem(sharedKey);
        if (shared === "dark" || shared === "light") return shared;
        const legacy = window.localStorage.getItem(legacyKey);
        if (legacy === "dark" || legacy === "light") return legacy;
      } catch {
        return null;
      }
      return null;
    };

    const applyThemeToModuleRoot = (mode: "light" | "dark") => {
      if (mode === "dark") {
        rootEl.setAttribute("data-theme", "dark");
      } else {
        rootEl.removeAttribute("data-theme");
      }
    };

    const syncFromShell = () => {
      const shellMode = getThemeFromElement(shellRoot);
      if (shellRoot.hasAttribute("data-theme")) {
        applyThemeToModuleRoot(shellMode);
        return;
      }

      const storedMode = readStoredTheme();
      const mode = storedMode ?? shellMode;
      if (storedMode) {
        if (storedMode === "dark") {
          shellRoot.setAttribute("data-theme", "dark");
        } else {
          shellRoot.removeAttribute("data-theme");
        }
      }
      applyThemeToModuleRoot(mode);
    };

    syncFromShell();

    const shellThemeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          applyThemeToModuleRoot(getThemeFromElement(shellRoot));
          return;
        }
      }
    });
    shellThemeObserver.observe(shellRoot, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== sharedKey && event.key !== legacyKey) return;
      const storedMode = readStoredTheme() ?? "light";
      if (storedMode === "dark") {
        shellRoot.setAttribute("data-theme", "dark");
      } else {
        shellRoot.removeAttribute("data-theme");
      }
    };
    window.addEventListener("storage", onStorage);

    if (themeCleanupRef.current) {
      themeCleanupRef.current();
      themeCleanupRef.current = null;
    }
    themeCleanupRef.current =
      ensureThemeToggle(rootEl, t("toggleTheme"), {
        target: shellRoot,
        storageKey: sharedKey,
        placement: "bottom-right",
      }) || null;

    return () => {
      shellThemeObserver.disconnect();
      window.removeEventListener("storage", onStorage);
      if (themeCleanupRef.current) {
        themeCleanupRef.current();
        themeCleanupRef.current = null;
      }
    };
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <main ref={rootRef}>
        <AppView locale={locale === "vi" ? "vi" : "en"} />
      </main>
    </QueryClientProvider>
  );
}
