import { useEffect } from "react";
import { getToastStyle, ui } from "../styles/ui";

export default function Toast({ items, onRemove }) {
  useEffect(() => {
    if (!items.length) return;

    const timers = items.map((item) =>
      setTimeout(() => {
        onRemove(item.id);
      }, item.duration || 2500)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items, onRemove]);

  if (!items.length) return null;

  return (
    <div style={ui.toastWrap}>
      {items.map((item) => (
        <div key={item.id} style={getToastStyle(item.type)}>
          {item.message}
        </div>
      ))}
    </div>
  );
}