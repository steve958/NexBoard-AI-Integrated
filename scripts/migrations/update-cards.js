const fs = require('fs');

// Read BoardClient.tsx
const boardClientPath = 'src/app/boards/[id]/BoardClient.tsx';
let content = fs.readFileSync(boardClientPath, 'utf8');

// Use regex to find and replace the button content more flexibly (with leading whitespace)
const pattern = /\s*<button data-task-id=\{t\.taskId\}[^>]+className=\{`w-full text-left rounded-lg p-3[^`]+`\}[^>]*>[\s\S]*?<\/button>\s*\}\)/;

const newTaskCard = `<button
                                  data-task-id={t.taskId}
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setSelectedTaskId(t.taskId)}
                                  className={\`w-full text-left rounded-xl p-4 nb-card group \${selectedTaskId===t.taskId ? 'ring-2 ring-[--nb-ring]' : ''}\`}
                                  tabIndex={selectedTaskId===t.taskId ? 0 : -1}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-sm font-semibold leading-snug flex-1">{t.title}</h3>
                                    <DueChip due={t.dueDate} />
                                  </div>

                                  {t.description && (
                                    <p className="text-xs opacity-60 line-clamp-2 mb-3 leading-relaxed">
                                      {t.description}
                                    </p>
                                  )}

                                  {hasSubtasks && (
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
                                  )}

                                  {(() => {
                                    const m = memberProfiles.find((mp) => mp.uid === t.assigneeId);
                                    return t.assigneeId ? (
                                      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'color-mix(in srgb, var(--nb-ink) 6%, transparent)' }}>
                                        <Avatar uid={t.assigneeId!} name={m?.name} email={m?.email} />
                                        <span className="text-xs font-medium opacity-70">{m?.name || m?.email || 'Assignee'}</span>
                                      </div>
                                    ) : null;
                                  })()}
                                </button>
                              )}`;

if (pattern.test(content)) {
  content = content.replace(pattern, newTaskCard);
  fs.writeFileSync(boardClientPath, content, 'utf8');
  console.log('✓ Updated BoardClient.tsx task cards');
} else {
  console.log('✗ Task card pattern not found in BoardClient.tsx');
  // Try to find partial matches
  if (content.includes('rounded-lg p-3')) {
    console.log('Found "rounded-lg p-3" in file');
  }
  if (content.includes('<button data-task-id={t.taskId}')) {
    console.log('Found button opening tag');
  }
}
