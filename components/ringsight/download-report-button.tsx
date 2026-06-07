'use client';

import { Download, Printer } from 'lucide-react';

interface DownloadReportButtonProps {
  caseId: string;
  markdown: string;
}

export function DownloadReportButton({ caseId, markdown }: DownloadReportButtonProps) {
  function handleMarkdownDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseId}-investigation-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePdfDownload() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(buildPrintableReport(caseId, markdown));
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handlePdfDownload}
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-700"
      >
        <Printer className="h-4 w-4" />
        Save as PDF
      </button>
      <button
        onClick={handleMarkdownDownload}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Download className="h-4 w-4" />
        Markdown
      </button>
    </div>
  );
}

function buildPrintableReport(caseId: string, markdown: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(caseId)} Investigation Report</title>
  <style>
    @page { margin: 0.65in; }
    body {
      color: #18181b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
      margin: 0;
    }
    h1 { font-size: 28px; line-height: 1.2; margin: 0 0 18px; }
    h2 { border-top: 1px solid #e4e4e7; font-size: 18px; margin: 26px 0 10px; padding-top: 16px; }
    p { font-size: 13px; margin: 8px 0; }
    strong { color: #09090b; }
    code {
      background: #f4f4f5;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 1px 4px;
    }
    ul { margin: 8px 0 8px 20px; padding: 0; }
    li { font-size: 13px; margin: 4px 0; }
    hr { border: 0; border-top: 1px solid #e4e4e7; margin: 18px 0; }
    .meta {
      color: #71717a;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="meta">RingSight PDF Export</div>
  ${markdownToHtml(markdown)}
</body>
</html>`;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line === '---') {
      closeList();
      html.push('<hr />');
      continue;
    }

    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${renderInline(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function renderInline(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
