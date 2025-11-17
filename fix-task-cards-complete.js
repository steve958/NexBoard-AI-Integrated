const fs = require('fs');

console.log('🔧 Completing task card redesign...\n');

const boardClientPath = 'src/app/boards/[id]/BoardClient.tsx';
if (fs.existsSync(boardClientPath)) {
  let content = fs.readFileSync(boardClientPath, 'utf8');

  // Fix 1: Update subtasks progress bar - use regex for more flexible matching
  const subtasksPattern = /\{hasSubtasks && \(\s*<div className="mt-2">\s*<div className="h-1 w-full rounded bg-white\/10">\s*<div className="h-1 rounded nb-chip-teal"[\s\S]*?<\/div>\s*<div className="text-\[10px\] opacity-60 mt-0\.5">\{doneCount\}\/\{subs\.length\} subtasks<\/div>\s*<\/div>\s*\)\}/;

  const newSubtasks = `{hasSubtasks && (
                                    <div className="mb-3 space-y-1.5">
                                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--nb-ink) 8%, transparent)' }}>
                                        <div
                                          className="h-1.5 rounded-full transition-all duration-300"
                                          style={{
                                            width: \`\${subs.length ? Math.round((doneCount / subs.length) * 100) : 0}%\`,
                                            backgroundColor: 'var(--nb-teal)'
                                          }}
                                        />
                                      </div>
                                      <div className="text-[11px] font-medium" style={{ color: 'color-mix(in srgb, var(--nb-ink) 50%, transparent)' }}>
                                        {doneCount}/{subs.length} completed
                                      </div>
                                    </div>
                                  )}`;

  // Fix 2: Update assignee section - use regex
  const assigneePattern = /<div className="mt-2 flex items-center gap-2 text-xs opacity-80">\s*\{\(\(\) => \{[\s\S]*?<\/div>/;

  const newAssignee = `{(() => {
                                    const m = memberProfiles.find((mp) => mp.uid === t.assigneeId);
                                    return t.assigneeId ? (
                                      <div className="flex items-center gap-2 pt-3 mt-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 6%, transparent)' }}>
                                        <Avatar uid={t.assigneeId!} name={m?.name} email={m?.email} />
                                        <span className="text-xs font-medium opacity-70">{m?.name || m?.email || 'Assignee'}</span>
                                      </div>
                                    ) : null;
                                  })()}`;

  let changesMade = 0;

  if (subtasksPattern.test(content)) {
    content = content.replace(subtasksPattern, newSubtasks);
    changesMade++;
    console.log('✓ Updated subtasks progress bar');
  } else {
    console.log('⚠ Subtasks section pattern not matched');
  }

  if (assigneePattern.test(content)) {
    content = content.replace(assigneePattern, newAssignee);
    changesMade++;
    console.log('✓ Updated assignee section');
  } else {
    console.log('⚠ Assignee section pattern not matched');
  }

  if (changesMade > 0) {
    fs.writeFileSync(boardClientPath, content, 'utf8');
    console.log('\n✨ Task cards redesign complete!\n');
    console.log('Improvements applied:');
    console.log('  • Progress bar: Thicker (h-1 → h-1.5), 50% more visible');
    console.log('  • Progress bar: Pill-shaped (rounded → rounded-full)');
    console.log('  • Progress bar: Smooth 300ms animation on changes');
    console.log('  • Progress bar: Theme-aware colors with color-mix()');
    console.log('  • Progress text: "subtasks" → "completed" (more positive)');
    console.log('  • Progress text: Larger and bolder (10px → 11px, font-medium)');
    console.log('  • Assignee: Clean border-top separator');
    console.log('  • Assignee: Better spacing and alignment');
    console.log('  • Overall: More modern, polished appearance\n');
  } else {
    console.log('\n⚠ No changes made - patterns not found\n');
  }
} else {
  console.log('✗ BoardClient.tsx not found\n');
}
