import { useState } from "react";

export default function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "확인",
    cancelText: "취소",
    danger: false,
    onConfirm: null,
  });

  function askConfirm({
    title,
    message,
    confirmText = "확인",
    cancelText = "취소",
    danger = false,
    onConfirm,
  }) {
    setConfirmState({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      danger,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmState((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
    }));
  }

  async function handleConfirm() {
    try {
      if (confirmState.onConfirm) {
        await confirmState.onConfirm();
      }
    } finally {
      closeConfirm();
    }
  }

  return {
    confirmState,
    askConfirm,
    closeConfirm,
    handleConfirm,
  };
}