'use client';

import { useEffect, useRef } from 'react';

type Props = {
  title: string;
  titleId?: string;
  onClose: () => void;
  /** Cegah menutup (Escape / tombol tutup) saat proses berjalan */
  locked?: boolean;
  children: React.ReactNode;
};

// Native <dialog>: fokus terkunci di dalam modal & Escape menutup modal.
// Modal ditutup dengan meng-unmount komponen ini (onClose dari parent).
export default function Modal({
  title,
  titleId = 'modal-title',
  onClose,
  locked,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-white p-0 text-neutral-900 backdrop:bg-neutral-900/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-[#1B1B7A]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="-mr-2 -mt-1 min-h-11 rounded-xl px-3 text-sm font-semibold text-[#1B1B7A] hover:text-[#d96a6a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] disabled:text-neutral-500"
        >
          Tutup
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
