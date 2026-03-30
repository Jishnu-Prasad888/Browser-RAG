import React from "react";
import { AlertTriangle, X } from "lucide-react";

export interface AlertBoxProps {
  title: string;
  msg: string;
  onClose?: () => void;
}

const AlertBox: React.FC<AlertBoxProps> = ({ title, msg, onClose }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 200,
        animation: "msgFadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "18px",
          padding: "28px",
          maxWidth: "380px",
          width: "calc(100% - 40px)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} color="#ef4444" />
          </div>

          <div style={{ flex: 1 }}>
            {/* Accent bar */}
            <div
              style={{
                width: "20px",
                height: "2px",
                borderRadius: "2px",
                background: "#ef4444",
                marginBottom: "8px",
              }}
            />
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: "1.1rem",
                fontWeight: 400,
                fontStyle: "italic",
                color: "var(--text-primary)",
                margin: "0 0 6px",
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.855rem",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              {msg}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                padding: "5px",
                cursor: "pointer",
                color: "var(--text-muted)",
                borderRadius: "7px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-primary)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--bg-active)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-muted)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "none";
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginTop: "22px",
              width: "100%",
              padding: "11px",
              borderRadius: "11px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-active)",
              color: "var(--text-primary)",
              fontSize: "0.83rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--accent-glow)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--border-focus)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--bg-active)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--border-subtle)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-primary)";
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertBox;
