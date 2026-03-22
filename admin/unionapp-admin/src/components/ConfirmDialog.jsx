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
  onClose,
}) {
  if (!open) return null;

  const handleClose = onCancel || onClose;

  return (
    <div
      style={ui.modalBackdrop}
      onClick={handleClose}
    >
      <div
        style={ui.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={ui.modalTitle}>{title}</div>
        <div style={ui.modalBody}>{message}</div>

        <div style={ui.modalActions}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose?.();
            }}
            style={ui.button}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm?.();
            }}
            style={
              danger
                ? {
                    ...ui.primaryButton,
                    background: "#dc2626",
                    border: "1px solid #dc2626",
                    color: "#fff",
                  }
                : ui.primaryButton
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}