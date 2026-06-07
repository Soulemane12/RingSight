'use client';

import React from 'react';

// Matches AC-XXXX, TX-XXXX, MR-XXXX, DV-XXXX, CASE-XXX, FIND-XXXXX
const ENTITY_RE = /\b((?:AC|TX|MR|DV|CASE|A\d)-[\w-]+|A\d-FIND-\d+)\b/g;

interface LinkifyProps {
  text: string;
  onViewInDocs: (query: string) => void;
  className?: string;
}

export function Linkify({ text, onViewInDocs, className }: LinkifyProps) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  ENTITY_RE.lastIndex = 0;
  while ((match = ENTITY_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    parts.push(
      <button
        key={`${token}-${match.index}`}
        onClick={() => onViewInDocs(token)}
        className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors"
        title={`View ${token} in dataset`}
      >
        {token}
      </button>
    );
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts}</span>;
}
