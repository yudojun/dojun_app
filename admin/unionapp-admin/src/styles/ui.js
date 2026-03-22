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
    alignItems: "center",
  },

  topActions: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
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
    alignItems: "center",
  },

  filterBar: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1fr 180px",
    gap: 10,
    alignItems: "center",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 16,
    marginTop: 18,
    minWidth: 0,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 16,
    marginTop: 18,
    minWidth: 0,
  },

  leftPane: {
    minWidth: 0,
  },

  rightPane: {
    minWidth: 0,
  },

  panel: {
    minWidth: 0,
  },

  sectionCard: {
    padding: 14,
    border: "1px solid #d8dee8",
    borderRadius: 14,
    background: "#ffffff",
    boxSizing: "border-box",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  issueCard: {
    border: "1px solid #d8dee8",
    borderRadius: 14,
    padding: 14,
    background: "#ffffff",
    boxSizing: "border-box",
    minWidth: 0,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    cursor: "pointer",
  },

  issueCardSelected: {
    border: "2px solid #2d8cff",
    boxShadow: "0 0 0 3px rgba(45, 140, 255, 0.12)",
  },

  formWrap: {
    border: "2px solid #2d8cff",
    borderRadius: 14,
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
    display: "block",
  },

  input: {
    width: "100%",
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
  },

  select: {
    width: "100%",
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
  },

  textarea: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    resize: "vertical",
    boxSizing: "border-box",
    minHeight: 130,
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    fontFamily: "inherit",
    lineHeight: 1.5,
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
    alignItems: "center",
  },

  formActions: {
    marginTop: 18,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  buttonRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },

  button: {
    padding: "5px 8px",
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },

  primaryButton: {
    padding: "5px 8px",
    border: "1px solid #2563eb",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },

  tabButton: {
    padding: "5px 8px",
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },

  activeTabButton: {
    padding: "5px 8px",
    border: "1px solid #2563eb",
    borderRadius: 10,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },

  metaText: {
    color: "#6b7280",
    marginTop: 4,
  },

  uidText: {
    color: "#4b5563",
  },

  subText: {
    color: "#666",
    marginTop: 6,
    lineHeight: 1.5,
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
    border: "1px solid #dbe4f0",
  },

  chartWrap: {
    marginTop: 16,
  },

  badgeBase: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.2,
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
    review: { bg: "#fef3c7", color: "#92400e" },
    open: { bg: "#e0f2fe", color: "#075985" },
    closed: { bg: "#ede9fe", color: "#5b21b6" },
    archived: { bg: "#fce7f3", color: "#9d174d" },
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