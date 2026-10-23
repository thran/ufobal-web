import Modal from '../../Modal';

interface Props {
  open: boolean;
  text: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, text, confirmLabel = 'Ano', onConfirm, onClose }: Props) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title={text}>
      <div className="grid grid-cols-2">
        <button type="button" className="pressbutton" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="pressbutton" onClick={onClose}>
          Zrušit
        </button>
      </div>
    </Modal>
  );
}
