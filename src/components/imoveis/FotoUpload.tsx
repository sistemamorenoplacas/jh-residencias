"use client";

import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface FotoUploadProps {
  /** `id`/`name` do input (o form action lê `formData.get(name)`). */
  id: string;
  name: string;
  /** Foto já cadastrada (modo editar). */
  fotoAtual?: string | null;
  nomeImovel?: string;
}

const IconCamera = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .9-.55l.6-1.2A1 1 0 0 1 10.1 3.7h3.8a1 1 0 0 1 .9.55l.6 1.2a1 1 0 0 0 .9.55h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </svg>
);

const IconTrash = (
  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

/**
 * Campo de foto com área de soltar/tocar, pré-visualização e troca. O
 * `<input type="file">` continua no form (só fica visualmente escondido),
 * então a Server Action recebe o arquivo do mesmo jeito.
 */
export function FotoUpload({ id, name, fotoAtual, nomeImovel }: FotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  // Libera a URL temporária da pré-visualização ao trocar/desmontar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function aplicarArquivo(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      setNomeArquivo(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setNomeArquivo(file.name);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    aplicarArquivo(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastando(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !inputRef.current) return;
    // Coloca o arquivo solto dentro do input para o form enviá-lo.
    const dt = new DataTransfer();
    dt.items.add(file);
    inputRef.current.files = dt.files;
    aplicarArquivo(file);
  }

  function limpar() {
    if (inputRef.current) inputRef.current.value = "";
    aplicarArquivo(null);
  }

  const imagem = preview ?? fotoAtual ?? null;

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          arrastando ? "border-brand bg-brand-tint" : "border-line-strong bg-canvas"
        }`}
      >
        {imagem ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem}
              alt={nomeImovel ? `Foto de ${nomeImovel}` : "Pré-visualização da foto"}
              className="h-40 w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink/70 to-transparent px-3 pb-2.5 pt-8 text-xs text-white">
              <span className="truncate">
                {nomeArquivo ? `Nova foto: ${nomeArquivo}` : "Foto atual"}
              </span>
              <span className="flex shrink-0 gap-1.5">
                <label
                  htmlFor={id}
                  className="cursor-pointer rounded-pill bg-white/90 px-2.5 py-1 font-semibold text-ink transition-colors hover:bg-white"
                >
                  Trocar
                </label>
                {nomeArquivo ? (
                  <button
                    type="button"
                    onClick={limpar}
                    className="inline-flex items-center gap-1 rounded-pill bg-white/20 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/30"
                  >
                    {IconTrash}
                    Desfazer
                  </button>
                ) : null}
              </span>
            </div>
          </div>
        ) : (
          <label
            htmlFor={id}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 px-4 py-7 text-center"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-tint text-brand">
              {IconCamera}
            </span>
            <span className="text-sm font-semibold text-ink">Adicionar foto</span>
            <span className="text-xs text-faint">
              Toque para escolher ou arraste a imagem aqui · JPG, PNG ou WebP até 8 MB
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
