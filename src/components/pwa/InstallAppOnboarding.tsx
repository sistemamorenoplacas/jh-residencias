"use client";

import { useEffect, useMemo, useState } from "react";

import { usePwaInstall, type PwaPlatform } from "./usePwaInstall";
import "./pwa-onboarding.css";

/**
 * Onboarding animado "estilo vídeo" que ensina a transformar o site em app
 * (Add to Home Screen) no primeiro acesso pelo celular — roteiro por SO:
 *
 *   iOS  → Safari não permite instalar por código. Ensinamos o gesto:
 *          Mais (•••) → Compartilhar → Adicionar à Tela de Início → Adicionar.
 *   Android → quando o Chrome oferece `beforeinstallprompt`, instalamos com 1
 *             toque (prompt nativo). Sem o prompt, ensinamos o menu ⋮.
 *
 * No desktop o auto-start não dispara (ver usePwaInstall), mas se aberto
 * manualmente mostramos um seletor iOS/Android. Portado do Orizon.
 */

const AUTO_MS = 3200; // duração de cada "cena" antes de avançar sozinho

type PlataformaMovel = Exclude<PwaPlatform, "other">;

// ---- ícones (inline, sem dependência de asset) ----
const IcoShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" /><path d="m8 8 4-4 4 4" />
    <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
const IcoPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const IcoDots = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
  </svg>
);
// iOS usa "Mais" com três pontos HORIZONTAIS (Android/Chrome usa verticais).
const IcoDotsH = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" />
  </svg>
);
const IcoDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);
const IcoChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
const IcoArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

interface Passo {
  titulo: string;
  texto: React.ReactNode;
}

const PASSOS_IOS: Passo[] = [
  {
    titulo: "Toque no botão Mais",
    texto: (
      <>Na barra do Safari, toque no botão <span className="inline-ico"><IcoDotsH /></span> <b>Mais (•••)</b>, no canto inferior direito.</>
    ),
  },
  {
    titulo: "Toque em Compartilhar",
    texto: (
      <>No menu que abre, toque em <span className="inline-ico"><IcoShare /></span> <b>Compartilhar</b>.</>
    ),
  },
  {
    titulo: "Adicionar à Tela de Início",
    texto: (
      <>Role as opções e toque em <b>“Adicionar à Tela de Início”</b> <span className="inline-ico"><IcoPlus /></span>.</>
    ),
  },
  {
    titulo: "Toque em Adicionar",
    texto: <>Confirme no botão <b>Adicionar</b>, no topo. O ícone da <b>JH Residências</b> aparece na tela de início.</>,
  },
];

const PASSOS_ANDROID: Passo[] = [
  {
    titulo: "Abra o menu",
    texto: (
      <>Toque no menu <span className="inline-ico"><IcoDots /></span> no canto superior do Chrome.</>
    ),
  },
  {
    titulo: "Instalar aplicativo",
    texto: <>Toque em <b>“Instalar app”</b> (ou “Adicionar à tela inicial”).</>,
  },
  {
    titulo: "Pronto, virou app!",
    texto: <>Confirme e o ícone da <b>JH Residências</b> aparece na sua tela inicial.</>,
  },
];

// ---------- Cenas animadas dentro do "celular" ----------

function CenaWeb() {
  return (
    <div className="web">
      <div className="web__logo" />
      <div className="web__bar w90" />
      <div className="web__bar w70" />
      <div className="web__bar w50" />
      <div className="web__chip">JH Residências</div>
    </div>
  );
}

function CenaHome({ posicaoNovo }: { posicaoNovo: number }) {
  return (
    <div className="home">
      <div className="home__grid">
        {[0, 1, 2, 3].map((i) =>
          i === posicaoNovo ? (
            <div key={i} className="home__slot is-new"><div className="home__icon" /><div className="home__label">JH</div></div>
          ) : (
            <div key={i} className="home__slot"><div className="home__icon placeholder-a" /><div className="home__label" /></div>
          ),
        )}
      </div>
    </div>
  );
}

function DeviceIOS({ passo }: { passo: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone__screen">
        {passo < 3 ? <CenaWeb /> : <CenaHome posicaoNovo={2} />}

        {/* Barra Safari (iOS 26 Liquid Glass): voltar · endereço · Mais ⋯ — passos 0-1 */}
        {passo <= 1 && (
          <div className="safaribar">
            <span className="g-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </span>
            <div className="g-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 8h14M5 16h14" /></svg>
              <span>jhresidencias.com</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9a8 8 0 0 1 13-3M20 15a8 8 0 0 1-13 3" /></svg>
            </div>
            <span className={`g-circle${passo === 0 ? " is-target" : ""}`}><IcoDotsH /></span>
          </div>
        )}

        {/* Menu "Mais" (passo 1) — Compartilhar é o alvo */}
        {passo === 1 && (
          <div className="iosmenu">
            <div className="iosmenu__row is-target"><IcoShare /><span>Compartilhar</span></div>
            <div className="iosmenu__row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v16l-6-4-6 4Z" /></svg>
              <span>Adicionar a Favoritos</span>
            </div>
            <div className="iosmenu__sep" />
            <div className="iosmenu__row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
              <span>Nova Aba</span>
            </div>
          </div>
        )}

        {/* Folha de compartilhamento (passo 2) — Adicionar à Tela de Início é o alvo */}
        {passo === 2 && (
          <div className="sheet">
            <div className="sheet__head">
              <span className="sheet__app" />
              <div className="sheet__appmeta">
                <b>JH Residências</b>
                <span>www.jhresidencias.com</span>
              </div>
            </div>
            <div className="sheet__row">
              <span className="sheet__ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
              </span>
              <span className="sheet__txt">Copiar</span>
            </div>
            <div className="sheet__row is-target">
              <span className="sheet__ico"><IcoPlus /></span>
              <span className="sheet__txt">Adicionar à Tela de Início</span>
            </div>
          </div>
        )}

        {/* dedo animado */}
        {passo === 0 && <span className="tap tap--more" />}
        {passo === 1 && <span className="tap tap--iosshare" />}
        {passo === 2 && <span className="tap tap--row" />}
      </div>
    </div>
  );
}

function DeviceAndroid({ passo }: { passo: number }) {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone__screen">
        {passo < 2 ? <CenaWeb /> : <CenaHome posicaoNovo={1} />}

        {passo < 2 && (
          <div className="chromebar">
            <div className="chromebar__url">jhresidencias.com</div>
            <span className={`chromebar__menu${passo === 0 ? " is-target" : ""}`}><IcoDots /></span>
          </div>
        )}

        {passo === 1 && (
          <div className="amenu">
            <div className="amenu__row"><IcoShare /><span>Compartilhar</span></div>
            <div className="amenu__row is-target"><IcoDownload /><span>Instalar app</span></div>
            <div className="amenu__row"><IcoChevron /><span>Configurações</span></div>
          </div>
        )}

        {passo === 0 && <span className="tap tap--menu" />}
      </div>
    </div>
  );
}

// ---------- Roteiro (cenas + passos + ações) ----------

interface RoteiroProps {
  plataforma: PlataformaMovel;
  /** Android com `beforeinstallprompt` capturado: 1 toque instala de verdade. */
  podeInstalarNativo: boolean;
  onInstalarNativo: () => Promise<"accepted" | "dismissed" | null>;
  onConcluir: () => void;
}

/**
 * Montado com `key` pelo pai, então o `passo` volta a 0 toda vez que o overlay
 * abre ou a plataforma muda — sem precisar de setState dentro de effect.
 */
function Roteiro({ plataforma, podeInstalarNativo, onInstalarNativo, onConcluir }: RoteiroProps) {
  const [passo, setPasso] = useState(0);
  const passos = plataforma === "ios" ? PASSOS_IOS : PASSOS_ANDROID;
  const total = passos.length;
  const ehUltimo = passo >= total - 1;

  // Auto-avanço "estilo vídeo": encadeia as cenas e para no último passo.
  useEffect(() => {
    if (ehUltimo) return;
    const t = window.setTimeout(() => setPasso((p) => Math.min(p + 1, total - 1)), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [passo, total, ehUltimo]);

  const instalarNativo = async () => {
    const outcome = await onInstalarNativo();
    // Usuário recusou o prompt nativo: cai para o tutorial manual.
    if (outcome === "dismissed") setPasso(0);
  };

  return (
    <>
      <div className="pwa-ob__stage">
        {plataforma === "ios" ? <DeviceIOS passo={passo} /> : <DeviceAndroid passo={passo} />}
      </div>

      <div className="pwa-ob__steps">
        <div className="pwa-ob__step">
          <span className="pwa-ob__num">{passo + 1}</span>
          <span className="pwa-ob__steptxt">
            <b>{passos[passo].titulo}.</b> {passos[passo].texto}
          </span>
        </div>
      </div>

      <div className="pwa-ob__actions">
        {podeInstalarNativo ? (
          <button type="button" className="pwa-ob__btn pwa-ob__btn--primary" onClick={instalarNativo}>
            <IcoDownload /> Instalar agora
          </button>
        ) : ehUltimo ? (
          <button type="button" className="pwa-ob__btn pwa-ob__btn--primary" onClick={onConcluir}>
            Entendi
          </button>
        ) : (
          <button
            type="button"
            className="pwa-ob__btn pwa-ob__btn--primary"
            onClick={() => setPasso((p) => Math.min(p + 1, total - 1))}
          >
            Próximo <IcoChevron />
          </button>
        )}

        <div className="pwa-ob__footer-row">
          {passo > 0 ? (
            <button type="button" className="pwa-ob__btn pwa-ob__btn--ghost" onClick={() => setPasso((p) => Math.max(p - 1, 0))}>
              <IcoArrowLeft /> Voltar
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="pwa-ob__btn pwa-ob__btn--ghost" onClick={onConcluir}>
            Agora não
          </button>
        </div>
      </div>
    </>
  );
}

// ---------- Componente principal ----------

export function InstallAppOnboarding() {
  const pwa = usePwaInstall();
  // No desktop deixamos o usuário escolher qual tutorial ver.
  const [plataformaVista, setPlataformaVista] = useState<PlataformaMovel>("ios");

  const plataforma: PlataformaMovel = pwa.plataforma === "other" ? plataformaVista : pwa.plataforma;
  const podeInstalarNativo = plataforma === "android" && pwa.temPromptNativo;

  // ESC fecha.
  useEffect(() => {
    if (!pwa.aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") pwa.fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pwa.aberto, pwa]);

  const tituloCabecalho = useMemo(() => {
    if (podeInstalarNativo) return "Instale o app da JH Residências";
    return plataforma === "ios" ? "Instale como app no iPhone" : "Instale como app no Android";
  }, [podeInstalarNativo, plataforma]);

  if (!pwa.aberto || pwa.instalado) return null;

  return (
    <div className="pwa-ob" role="dialog" aria-modal="true" aria-label={tituloCabecalho}>
      <div className="pwa-ob__scrim" onClick={pwa.fechar} />

      <div className="pwa-ob__card">
        <div className="pwa-ob__grip" />
        <button type="button" className="pwa-ob__close" onClick={pwa.fechar} aria-label="Fechar">
          <IcoClose />
        </button>

        <div className="pwa-ob__head">
          <span className="pwa-ob__eyebrow"><span className="dot" /> Acesso rápido</span>
          <h2 className="pwa-ob__title">{tituloCabecalho}</h2>
          <p className="pwa-ob__sub">
            Adicione a JH Residências à <b>tela de início</b> e abra como um aplicativo — tela cheia, mais rápido, sem digitar o endereço.
          </p>
        </div>

        {/* Seletor de plataforma só no desktop (aberto manualmente) */}
        {pwa.plataforma === "other" && (
          <div className="pwa-ob__seg" role="tablist" aria-label="Escolha o sistema">
            <button
              type="button"
              role="tab"
              aria-selected={plataformaVista === "ios"}
              className={plataformaVista === "ios" ? "is-active" : ""}
              onClick={() => setPlataformaVista("ios")}
            >
              iPhone (iOS)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={plataformaVista === "android"}
              className={plataformaVista === "android" ? "is-active" : ""}
              onClick={() => setPlataformaVista("android")}
            >
              Android
            </button>
          </div>
        )}

        <Roteiro
          key={plataforma}
          plataforma={plataforma}
          podeInstalarNativo={podeInstalarNativo}
          onInstalarNativo={pwa.instalarNativo}
          onConcluir={pwa.concluir}
        />
      </div>
    </div>
  );
}
