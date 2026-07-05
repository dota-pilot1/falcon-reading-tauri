import katex from "katex";

type MathTextProps = {
  text: string;
  className?: string;
};

const mathPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}

function renderMathToken(token: string) {
  const displayMode = token.startsWith("$$") || token.startsWith("\\[");
  const expression = token.startsWith("$$")
    ? token.slice(2, -2)
    : token.startsWith("\\[")
      ? token.slice(2, -2)
      : token.startsWith("\\(")
        ? token.slice(2, -2)
        : token.slice(1, -1);

  return katex.renderToString(expression, {
    displayMode,
    throwOnError: false,
    strict: false,
  });
}

function renderMathText(text: string) {
  const html: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(mathPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) html.push(escapeHtml(text.slice(cursor, index)));
    html.push(renderMathToken(match[0]));
    cursor = index + match[0].length;
  }

  if (cursor < text.length) html.push(escapeHtml(text.slice(cursor)));
  return html.join("");
}

export function MathText({ text, className }: MathTextProps) {
  if (!text.trim()) return null;

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMathText(text) }}
    />
  );
}
