"use client";

export default function Footer() {
  return (
    <footer
      style={{
        background: "rgba(17,17,17,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <a
        href="https://x.com/use_origin"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "rgba(255,255,255,0.35)", transition: "color 0.15s ease", lineHeight: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#ffffff")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.35)")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>
        </svg>
      </a>
    </footer>
  );
}
