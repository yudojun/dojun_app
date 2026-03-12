export const ui = {
  page: {
    maxWidth: 1180,
    margin: "30px auto",
    padding: 12,
    boxSizing: "border-box",
  },

  authPage: {
    maxWidth: 420,
    margin: "50px auto",
    padding: 12,
  },

  statusPage: {
    maxWidth: 720,
    margin: "40px auto",
    padding: 12,
  },

  toolbar: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  tabGroup: {
    marginLeft: "auto",
    display: "flex",
    gap: 6,
  },

  filterGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1fr 180px 150px",
    gap: 10,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 16,
    marginTop: 18,
    minWidth: 0,
  },

  panel: {
    minWidth: 0,
  },

  sectionCard: {
    padding: 14,
    border: "1px solid #ddd",
    borderRadius: 12,
    background: "#fff",
    boxSizing: "border-box",
  },

  issueCard: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
    boxSizing: "border-box",
    minWidth: 0,
  },

  issueCardSelected: {
    border: "2px solid #2d8cff",
  },

  formWrap: {
    border: "2px solid #2d8cff",
    borderRadius: 12,
    padding: 20,
    background: "#f8fbff",
    boxSizing: "border-box",
    width: "100%",
  },

  formTitle: {
    fontWeight: 900,
    fontSize: 24,
    marginBottom: 18,
    color: "#1f3b64",
  },

  fieldLabel: {
    fontWeight: 800,
    fontSize: 15,
    color: "#1f3b64",
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    resize: "vertical",
    boxSizing: "border-box",
    minHeight: 130,
  },

  formGrid: {
    display: "grid",
    gap: 14,
    minWidth: 0,
  },

  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    minWidth: 0,
  },

  threeColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    minWidth: 0,
  },

  minCell: {
    minWidth: 0,
  },

  actionsRow: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  formActions: {
    marginTop: 18,
    display: "flex",
    gap: 10,
  },

  metaText: {
    color: "#777",
    marginTop: 4,
  },

  uidText: {
    color: "#555",
  },

  subText: {
    color: "#666",
    marginTop: 6,
  },

  mutedText: {
    color: "#888",
    fontSize: 12,
  },

  voteInfoBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#f7f9ff",
    boxSizing: "border-box",
  },

  chartWrap: {
    marginTop: 16,
  },

  buttonRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  badgeBase: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
  },

  toastWrap: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 9999,
    display: "grid",
    gap: 10,
    width: 320,
    maxWidth: "calc(100vw - 24px)",
  },

  toastBase: {
    borderRadius: 12,
    padding: "12px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    color: "#fff",
    fontWeight: 700,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    padding: 16,
  },

  modalCard: {
    width: "100%",
    maxWidth: 460,
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxSizing: "border-box",
    boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: "#111827",
    marginBottom: 10,
  },

  modalBody: {
    color: "#374151",
    lineHeight: 1.6,
  },

  modalActions: {
    marginTop: 18,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
};

export function getStatusBadgeStyle(status) {
  const map = {
    draft: { bg: "#f3f4f6", color: "#374151" },
    open: { bg: "#e0f2fe", color: "#075985" },
    closed: { bg: "#fef3c7", color: "#92400e" },
    archived: { bg: "#ede9fe", color: "#5b21b6" },
  };

  const picked = map[status] || map.draft;

  return {
    ...ui.badgeBase,
    background: picked.bg,
    color: picked.color,
  };
}

export function getToastStyle(type = "info") {
  const map = {
    success: { background: "#16a34a" },
    error: { background: "#dc2626" },
    info: { background: "#2563eb" },
    warning: { background: "#d97706" },
  };

  return {
    ...ui.toastBase,
    ...(map[type] || map.info),
  };
}