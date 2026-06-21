const fs = require('fs');
const path = require('path');

function patch(filePath, fn) {
  const full = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(full)) { console.log('SKIP (not found):', filePath); return; }
  let c = fs.readFileSync(full, 'utf8');
  const before = c;
  c = fn(c);
  if (c !== before) {
    fs.writeFileSync(full, c, 'utf8');
    console.log('patched:', filePath);
  } else {
    console.log('no change:', filePath);
  }
}

// ── Helper: replace all dialog max-w-lg / max-w-md with mobile-safe versions
function fixDialogs(c) {
  // DialogContent max-w-lg → w-[calc(100vw-2rem)] max-w-lg
  c = c.replace(/className="([^"]*?)max-w-lg([^"]*?)"/g, (m, before, after) => {
    if (m.includes('w-[calc')) return m;
    return `className="${before}w-[calc(100vw-2rem)] max-w-lg${after}"`;
  });
  c = c.replace(/className="([^"]*?)max-w-md([^"]*?)"/g, (m, before, after) => {
    if (m.includes('w-[calc')) return m;
    return `className="${before}w-[calc(100vw-2rem)] max-w-md${after}"`;
  });
  return c;
}

// ── Helper: fix search input width
function fixSearchInput(c) {
  c = c.replace(/max-w-\[220px\]/g, 'flex-1 min-w-[140px] max-w-xs');
  return c;
}

// ── Helper: fix toolbar flex to wrap
function fixToolbar(c) {
  // flex items-center gap-2 flex-wrap already ok
  // flex items-center gap-2 without flex-wrap → add flex-wrap
  c = c.replace(/className="flex items-center gap-2((?!flex-wrap)[^"]*)"/g, (m, rest) => {
    return `className="flex flex-wrap items-center gap-2${rest}"`;
  });
  c = c.replace(/className="flex items-center gap-3((?!flex-wrap)[^"]*)"/g, (m, rest) => {
    return `className="flex flex-wrap items-center gap-3${rest}"`;
  });
  return c;
}

// ── Helper: reduce page padding
function fixPadding(c) {
  // Main page containers: flex-1 p-6 → flex-1 p-3 sm:p-6
  c = c.replace(/className="flex-1 p-6 /g, 'className="flex-1 p-3 sm:p-6 ');
  c = c.replace(/className="flex-1 p-6"/g, 'className="flex-1 p-3 sm:p-6"');
  // space-y-6 → space-y-4 sm:space-y-6 in page containers
  c = c.replace(/flex-1 p-3 sm:p-6 space-y-6/g, 'flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6');
  return c;
}

// ── Helper: remove min-w-[900px] wrappers
function removeMinWidth(c) {
  c = c.replace(/<div className="min-w-\[900px\]">\s*/g, '');
  c = c.replace(/<div style=\{\{minWidth:'900px'\}\}>\s*/g, '');
  // Remove the closing div that corresponds to min-w wrapper (tricky - just remove the pattern)
  // Instead, find the pattern and collapse it
  return c;
}

// ══════════════════════════════════════════════════════════════════
// PATCH EACH PAGE
// ══════════════════════════════════════════════════════════════════

// Dashboard
patch('app/(dashboard)/dashboard/page.tsx', c => {
  c = fixPadding(c);
  return c;
});

// Tasks
patch('app/(dashboard)/tasks/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixSearchInput(c);
  c = fixToolbar(c);
  // Remove min-w-[900px] wrapper around DataTable
  c = c.replace(/<div className="min-w-\[900px\]">\s*/g, '');
  // Need to also remove the corresponding closing div - mark it
  // The pattern is: </DataTable> followed by </div> (the min-w closer)
  // Let's be safe and just look for the specific pattern
  c = c.replace(/(<\/DataTable>\s*)\n(\s*<\/div>)(\s*\n\s*<\/div>)/g, (m, dt, d1, d2) => {
    // Remove one extra closing div
    return dt + '\n' + d2;
  });
  return c;
});

// Projects
patch('app/(dashboard)/projects/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixSearchInput(c);
  c = fixToolbar(c);
  return c;
});

// Projects [id]
patch('app/(dashboard)/projects/[id]/page.tsx', c => {
  c = fixPadding(c);
  return c;
});

// Clients
patch('app/(dashboard)/clients/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixSearchInput(c);
  c = fixToolbar(c);
  return c;
});

// Clients [id]
patch('app/(dashboard)/clients/[id]/page.tsx', c => {
  c = fixPadding(c);
  return c;
});

// Employees
patch('app/(dashboard)/employees/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixSearchInput(c);
  c = fixToolbar(c);
  return c;
});

// Employees [id]
patch('app/(dashboard)/employees/[id]/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  // Fix profile grid: grid-cols-2 gap-4 inside the profile section → grid-cols-1 sm:grid-cols-2
  c = c.replace(/grid grid-cols-2 gap-4/g, 'grid grid-cols-1 sm:grid-cols-2 gap-4');
  c = c.replace(/grid grid-cols-3 gap-4/g, 'grid grid-cols-1 sm:grid-cols-3 gap-4');
  return c;
});

// Leads
patch('app/(dashboard)/leads/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixSearchInput(c);
  c = fixToolbar(c);
  // Remove min-w-[900px] wrapper
  c = c.replace(/<div className="min-w-\[900px\]">\s*/g, '');
  return c;
});

// Finance
patch('app/(dashboard)/finance/page.tsx', c => {
  c = fixPadding(c);
  c = fixDialogs(c);
  c = fixToolbar(c);
  return c;
});

// Reports
patch('app/(dashboard)/reports/page.tsx', c => {
  c = fixPadding(c);
  // Wrap recharts containers in overflow-x-auto if not already
  c = c.replace(/<ResponsiveContainer/g, (m) => m); // keep as-is, ResponsiveContainer handles this
  return c;
});

// AI
patch('app/(dashboard)/ai/page.tsx', c => {
  c = fixPadding(c);
  return c;
});

// Settings
patch('app/(dashboard)/settings/page.tsx', c => {
  c = fixPadding(c);
  // Agency info 2-col → 1-col mobile
  c = c.replace(/grid grid-cols-2 gap-4/g, 'grid grid-cols-1 sm:grid-cols-2 gap-4');
  c = c.replace(/grid grid-cols-3 gap-6/g, 'grid grid-cols-1 sm:grid-cols-3 gap-6');
  // Stats grid: already has lg:grid-cols-4 but missing sm — keep divide-x which needs same row
  // Just ensure it's responsive
  c = c.replace(/grid-cols-2 lg:grid-cols-4 divide-x/g, 'grid-cols-2 sm:grid-cols-4 divide-x');
  return c;
});

// Calendar
patch('app/(dashboard)/calendar/page.tsx', c => {
  c = fixPadding(c);
  return c;
});

console.log('\nAll done!');
