"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Detecção de plataforma + estado de instalação do PWA (Add to Home Screen).
 * Portado do onboarding do Orizon.
 *
 * O fluxo de "transformar o site em app" é diferente entre iOS e Android:
 *   - Android/Chrome dispara `beforeinstallprompt`; chamamos o prompt nativo
 *     direto, sem ensinar gesto nenhum.
 *   - iOS/Safari NÃO suporta `beforeinstallprompt`. A única via é o usuário
 *     tocar em Mais → Compartilhar → "Adicionar à Tela de Início", então só
 *     resta ensinar o gesto com a animação.
 *
 * A conclusão/descarte fica em `localStorage` (`jh-pwa-onboarding-v1`) para
 * não reaparecer a cada visita. Se o app já roda instalado (standalone),
 * nunca mostramos.
 */

const FLAG_KEY = "jh-pwa-onboarding-v1";
const OPEN_EVENT = "jh:pwa-onboarding-open";
/** Espera a página pintar antes de cobrir a tela. */
const AUTO_OPEN_DELAY_MS = 1400;

export type PwaPlatform = "ios" | "android" | "other";

/** Evento `beforeinstallprompt` (não tipado no lib.dom padrão). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectarPlataforma(): PwaPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  // iPadOS moderno se identifica como "Macintosh" — diferenciamos pelo toque.
  const ehIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  if (ehIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

/** App já aberto como PWA instalado (não faz sentido ensinar a instalar). */
export function appInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari expõe a flag proprietária `navigator.standalone`.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

/** Assinatura para `useSyncExternalStore`: muda quando o modo standalone muda. */
export function subscribeAppInstalado(onChange: () => void): () => void {
  const mq = typeof window !== "undefined" ? window.matchMedia?.("(display-mode: standalone)") : null;
  mq?.addEventListener("change", onChange);
  return () => mq?.removeEventListener("change", onChange);
}

/** Snapshot do servidor: nunca sabemos se é app instalado no SSR. */
const NAO_INSTALADO = () => false;

/** `true` quando a página roda como app instalado (seguro para hidratação). */
export function useAppInstalado(): boolean {
  return useSyncExternalStore(subscribeAppInstalado, appInstalado, NAO_INSTALADO);
}

function jaDescartou(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function gravarDescarte(): void {
  try {
    localStorage.setItem(FLAG_KEY, "1");
  } catch {
    // modo privado / storage bloqueado: apenas não persiste.
  }
}

/** Reabre o onboarding de instalação de qualquer lugar (ex.: item "Instalar como app"). */
export function abrirInstalacaoPwa(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export interface PwaInstallState {
  /** Plataforma detectada — define qual roteiro animado mostrar. */
  plataforma: PwaPlatform;
  /** Overlay aberto. */
  aberto: boolean;
  /** App já instalado/standalone — esconde qualquer CTA de instalação. */
  instalado: boolean;
  /** Há prompt nativo do Chrome disponível (Android). */
  temPromptNativo: boolean;
  /** Dispara o prompt nativo (Android). Retorna o desfecho ou null se indisponível. */
  instalarNativo: () => Promise<"accepted" | "dismissed" | null>;
  /** Fecha sem marcar como concluído (reaparece numa próxima visita). */
  fechar: () => void;
  /** Fecha e marca como concluído/descartado (não reaparece). */
  concluir: () => void;
}

export function usePwaInstall(): PwaInstallState {
  // Tudo começa "neutro" no servidor e é resolvido no cliente (evita
  // divergência de hidratação: o HTML do servidor não sabe o user-agent).
  const [plataforma, setPlataforma] = useState<PwaPlatform>("other");
  const [instalado, setInstalado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const p = detectarPlataforma();
    const inst = appInstalado();
    // Auto-abre no primeiro acesso: celular, não instalado, não descartado.
    const deveAbrir = !inst && p !== "other" && !jaDescartou();
    const t = window.setTimeout(() => {
      setPlataforma(p);
      setInstalado(inst);
      if (deveAbrir) setAberto(true);
    }, deveAbrir ? AUTO_OPEN_DELAY_MS : 0);
    return () => window.clearTimeout(t);
  }, []);

  // Captura o prompt nativo do Chrome antes que o navegador o use.
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalado(true);
      setAberto(false);
      gravarDescarte();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Reabertura manual via evento global.
  useEffect(() => {
    const onOpen = () => setAberto(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const fechar = useCallback(() => setAberto(false), []);

  const concluir = useCallback(() => {
    gravarDescarte();
    setAberto(false);
  }, []);

  const instalarNativo = useCallback(async (): Promise<"accepted" | "dismissed" | null> => {
    if (!promptEvent) return null;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null); // o evento só pode ser usado uma vez
    if (outcome === "accepted") {
      gravarDescarte();
      setAberto(false);
    }
    return outcome;
  }, [promptEvent]);

  return {
    plataforma,
    aberto,
    instalado,
    temPromptNativo: promptEvent !== null,
    instalarNativo,
    fechar,
    concluir,
  };
}
