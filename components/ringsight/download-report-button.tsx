'use client';

import { Download } from 'lucide-react';

interface DownloadReportButtonProps {
  caseId: string;
  markdown: string;
}

export function DownloadReportButton({ caseId, markdown }: DownloadReportButtonProps) {
  function handleDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseId}-investigation-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      Download Investigation Report
    </button>
  );
}
