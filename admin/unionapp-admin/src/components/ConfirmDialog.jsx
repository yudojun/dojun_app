import { ui } from "../styles/ui";

export default function ConfirmDialog({
  open,
  title = "확인",
  message = "",
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div style={ui.modalBackdrop}>
      <div style={ui.modalCard}>
        <div style={ui.modalTitle}>{title}</div>
        <div style={ui.modalBody}>{message}</div>

        <div style={ui.modalActions}>
          <button onClick={onCancel}>{cancelText}</button>
          <button
            onClick={onConfirm}
            style={danger ? { background: "#dc2626", color: "#fff" } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}