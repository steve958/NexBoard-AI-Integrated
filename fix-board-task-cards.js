const fs = require('fs');

console.log('🔧 Fixing BoardClient.tsx task cards...\n');

const boardClientPath = 'src/app/boards/[id]/BoardClient.tsx';
if (fs.existsSync(boardClientPath)) {
  let content = fs.readFileSync(boardClientPath, 'utf8');

  // Step 1: Update the button opening tag and className
  content = content.replace(
    /<button data-task-id=\{t\.taskId\} ref=\{prov\.innerRef\} \{\.\.\.prov\.draggableProps\} \{\.\.\.prov\.dragHandleProps\} onClick=\{\(\) => setSelectedTaskId\(t\.taskId\)\} className=\{`w-full text-left rounded-lg p-3 border transition-colors \$\{selectedTaskId===t\.taskId \? 'ring-2 ring-\[--nb-ring\] bg-white\/10 border-white\/20' : 'bg-white\/5 border-white\/10 hover:bg-white\/10'\}`\} tabIndex=\{selectedTaskId===t\.taskId \? 0 : -1\}>/g,
    `<button
                                  data-task-id={t.taskId}
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setSelectedTaskId(t.taskId)}
                                  className={\`w-full text-left rounded-xl p-4 nb-card group \${selectedTaskId===t.taskId ? 'ring-2 ring-[--nb-ring]' : ''}\`}
                                  tabIndex={selectedTaskId===t.taskId ? 0 : -1}
                                >`
  );

  // Step 2: Update title section
  content = content.replace(
    /<div className="text-sm font-medium flex items-center justify-between gap-2">\s*<span className="truncate">\{t\.title\}<\/span>\s*<DueChip due=\{t\.dueDate\} \/>\s*<\/div>/g,
    `<div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-sm font-semibold leading-snug flex-1">{t.title}</h3>
                                    <DueChip due={t.dueDate} />
                                  </div>`
  );

  // Step 3: Update description section
  content = content.replace(
    /\{t\.description && <div className="text-xs opacity-70 line-clamp-2 mt-1">\{t\.description\}<\/div>\}/g,
    `{t.description && (
                                    <p className="text-xs opacity-60 line-clamp-2 mb-3 leading-relaxed">
                                      {t.description}
                                    </p>
                                  )}`
  );

  // Step 4: Update subtasks progress bar section
  const oldSubtasks = `{hasSubtasks && (
                                    <div className="mt-2">
                                      <div className="h-1 w-full rounded bg-white/10">
                                        <div className="h-1 rounded nb-chip-teal" style={{ width: \`\${subs.length ? Math.round((doneCount / subs.length) * 100) : 0}%\` }} />
                                      </div>
                                      <div className="text-[10px] opacity-60 mt-0.5">{doneCount}/{subs.length} subtasks</div>
                                    </div>
                                  )}`;

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

  content = content.replace(oldSubtasks, newSubtasks);

  // Step 5: Update assignee section
  const oldAssignee = `<div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                                    {(() => { const m = memberProfiles.find((mp) => mp.uid === t.assigneeId); return t.assigneeId ? (<div className="flex items-center gap-1"><Avatar uid={t.assigneeId!} name={m?.name} email={m?.email} /><span>{m?.name || m?.email || 'Assignee'}</span></div>) : null; })()}
                                  </div>`;

  const newAssignee = `{(() => {
                                    const m = memberProfiles.find((mp) => mp.uid === t.assigneeId);
                                    return t.assigneeId ? (
                                      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 6%, transparent)' }}>
                                        <Avatar uid={t.assigneeId!} name={m?.name} email={m?.email} />
                                        <span className="text-xs font-medium opacity-70">{m?.name || m?.email || 'Assignee'}</span>
                                      </div>
                                    ) : null;
                                  })()}`;

  content = content.replace(oldAssignee, newAssignee);

  fs.writeFileSync(boardClientPath, content, 'utf8');
  console.log('✓ Updated BoardClient.tsx task cards\n');
  console.log('✨ All card redesigns complete!\n');
} else {
  console.log('✗ BoardClient.tsx not found\n');
}
