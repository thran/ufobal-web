import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/45" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <DialogPanel className="relative w-full max-w-lg border border-[#666] bg-white p-6 shadow-lg">
          <button type="button" onClick={onClose} aria-label="Zavřít" className="absolute top-2 right-3 text-2xl text-gray-500">
            ×
          </button>
          <DialogTitle className="mb-4 text-xl font-bold">{title}</DialogTitle>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
