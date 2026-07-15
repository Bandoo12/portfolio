import fs from 'fs';
import path from 'path';
import SiteHeader from '@/components/SiteHeader';

export const metadata = {
  title: 'SIDEP-1530 — Research | Agent PWA',
  robots: { index: false, follow: false },
};

const ACCENT = '#eb5015';
const BORDER = 'rgba(255,255,255,0.1)';
const MUTED = 'rgba(255,255,255,0.6)';

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*.+?\*\*|`[^`]+?`)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(
        <strong key={key} style={{ color: '#fff', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: '0.9em',
            fontFamily: 'ui-monospace, monospace',
            color: '#ffd7c2',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<span key={key}>{part}</span>);
    }
  });
  return nodes;
}

function parseMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`} style={{ margin: '12px 0 20px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {listBuffer.map((item, idx) => (
          <li key={idx} style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>
            {renderInline(item, `li-${key}-${idx}`)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    if (line.trim() === '---') {
      flushList();
      out.push(<hr key={`hr-${key++}`} style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '40px 0' }} />);
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      out.push(
        <h1 key={`h1-${key++}`} style={{ fontSize: 'clamp(26px,3.4vw,44px)', fontWeight: 600, lineHeight: 1.2, marginBottom: 8, color: '#fff' }}>
          {renderInline(line.slice(2), `h1-${key}`)}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      out.push(
        <h2
          key={`h2-${key++}`}
          style={{ fontSize: 'clamp(20px,2vw,28px)', fontWeight: 600, marginTop: 44, marginBottom: 16, color: '#fff', borderTop: `1px solid ${BORDER}`, paddingTop: 36 }}
        >
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      out.push(
        <h3 key={`h3-${key++}`} style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 10, color: ACCENT }}>
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      flushList();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\|[\s-]+\|[\s-:|]*$/.test(l.replace(/\|/g, '|')) || !/^-+$/.test(l.replace(/[|\s]/g, '')))
        .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
      const filteredRows = rows.filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
      const [head, ...body] = filteredRows;
      out.push(
        <div key={`table-${key++}`} style={{ overflowX: 'auto', margin: '20px 0 28px', borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14.5 }}>
            <thead>
              <tr>
                {head?.map((c, idx) => (
                  <th
                    key={idx}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      fontWeight: 700,
                      borderBottom: `1px solid ${BORDER}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {renderInline(c, `th-${key}-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ridx) => (
                <tr key={ridx} style={{ borderBottom: ridx === body.length - 1 ? 'none' : `1px solid ${BORDER}` }}>
                  {r.map((c, cidx) => (
                    <td key={cidx} style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.8)', verticalAlign: 'top', lineHeight: 1.55 }}>
                      {renderInline(c, `td-${key}-${ridx}-${cidx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line) || line.startsWith('- ')) {
      const content = line.replace(/^\d+\.\s/, '').replace(/^- /, '');
      listBuffer.push(content);
      i++;
      continue;
    }

    const imageMatch = /^!\[(.*?)\]\((.*?)\)$/.exec(line.trim());
    if (imageMatch) {
      flushList();
      const [, alt, src] = imageMatch;
      const wide = /desktop|rules-modal/.test(src);
      out.push(
        <figure
          key={`img-${key++}`}
          style={{ margin: '20px 0 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              maxWidth: wide ? 720 : 320,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              background: '#000',
            }}
          />
          <figcaption style={{ fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 480 }}>{alt}</figcaption>
        </figure>
      );
      i++;
      continue;
    }

    if (line.startsWith('**') && line.endsWith('**') && line.slice(2, -2).indexOf('**') === -1) {
      flushList();
      out.push(
        <p key={`p-${key++}`} style={{ fontWeight: 700, color: '#fff', marginTop: 20, marginBottom: 8 }}>
          {renderInline(line, `pb-${key}`)}
        </p>
      );
      i++;
      continue;
    }

    flushList();
    out.push(
      <p key={`p-${key++}`} style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, marginBottom: 14, fontSize: 15.5 }}>
        {renderInline(line, `p-${key}`)}
      </p>
    );
    i++;
  }

  flushList();
  return out;
}

export default function Sidep1530Page() {
  const filePath = path.join(process.cwd(), 'docs', 'sidep-1530-agent-pwa-redesign-research.md');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const content = parseMarkdown(raw);

  return (
    <div style={{ background: '#070709', color: '#fff', minHeight: '100dvh' }}>
      <SiteHeader />
      <main className="mx-auto px-6 py-16" style={{ maxWidth: 880 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            padding: '4px 12px',
            marginBottom: 24,
          }}
        >
          INTERNAL — NOT FOR PUBLIC INDEXING
        </div>
        {content}
      </main>
    </div>
  );
}
