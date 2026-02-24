const fs = require('fs');

console.log('🎨 Updating remaining card components...\n');

// =====================================================
// 1. Update my-tasks/page.tsx
// =====================================================
const myTasksPath = 'src/app/my-tasks/page.tsx';
if (fs.existsSync(myTasksPath)) {
  let content = fs.readFileSync(myTasksPath, 'utf8');

  const oldCard = `                      <Link
                        key={task.taskId}
                        href={\`/boards/\${projectId}?task=\${task.taskId}\`}
                        className="block nb-card rounded-lg p-4 hover:bg-white/5 transition-colors border border-white/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{task.title}</h3>
                              {task.columnName && (
                                <span className="px-2 py-0.5 text-xs rounded nb-chip-teal flex-shrink-0">
                                  {task.columnName}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm opacity-70 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {assignee && (
                              <Avatar uid={assignee.uid} name={assignee.name} email={assignee.email} />
                            )}
                            <DueChip due={task.dueDate} />
                          </div>
                        </div>
                      </Link>`;

  const newCard = `                      <Link
                        key={task.taskId}
                        href={\`/boards/\${projectId}?task=\${task.taskId}\`}
                        className="block nb-card rounded-xl p-5 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">{task.title}</h3>
                              {task.columnName && (
                                <span className="px-2.5 py-1 text-xs rounded-full nb-chip-teal flex-shrink-0 font-medium">
                                  {task.columnName}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm opacity-60 line-clamp-2 leading-relaxed">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {assignee && (
                              <Avatar uid={assignee.uid} name={assignee.name} email={assignee.email} />
                            )}
                            <DueChip due={task.dueDate} />
                          </div>
                        </div>
                      </Link>`;

  if (content.includes(oldCard)) {
    content = content.replace(oldCard, newCard);
    fs.writeFileSync(myTasksPath, content, 'utf8');
    console.log('✓ Updated my-tasks/page.tsx');
  } else {
    console.log('⚠ Could not find exact pattern in my-tasks/page.tsx');
  }
}

// =====================================================
// 2. Update CommentsThread.tsx
// =====================================================
const commentsPath = 'src/components/CommentsThread.tsx';
if (fs.existsSync(commentsPath)) {
  let content = fs.readFileSync(commentsPath, 'utf8');

  // Update comment cards
  content = content.replace(
    /className="nb-card rounded-md p-3"/g,
    'className="nb-card rounded-lg p-4"'
  );

  // Update comment input card
  content = content.replace(
    /className="nb-card rounded-md p-2"/g,
    'className="nb-card rounded-lg p-3"'
  );

  fs.writeFileSync(commentsPath, content, 'utf8');
  console.log('✓ Updated CommentsThread.tsx');
}

// =====================================================
// 3. Update settings/page.tsx
// =====================================================
const settingsPath = 'src/app/settings/page.tsx';
if (fs.existsSync(settingsPath)) {
  let content = fs.readFileSync(settingsPath, 'utf8');

  // Update main settings card
  content = content.replace(
    /className="nb-card rounded-xl p-6"/g,
    'className="nb-card-elevated rounded-2xl p-8"'
  );

  // Update nested form card if exists
  content = content.replace(
    /className="rounded-lg bg-white\/5 border border-white\/10 p-4"/g,
    'className="nb-card rounded-xl p-5"'
  );

  fs.writeFileSync(settingsPath, content, 'utf8');
  console.log('✓ Updated settings/page.tsx');
}

// =====================================================
// 4. Update BoardClient.tsx (Column containers)
// =====================================================
const boardClientPath = 'src/app/boards/[id]/BoardClient.tsx';
if (fs.existsSync(boardClientPath)) {
  let content = fs.readFileSync(boardClientPath, 'utf8');

  // Update column container styling
  content = content.replace(
    /className="rounded-xl nb-card nb-shadow p-3 min-h-\[240px\]"/g,
    'className="rounded-2xl nb-card p-4 min-h-[280px]"'
  );

  fs.writeFileSync(boardClientPath, content, 'utf8');
  console.log('✓ Updated BoardClient.tsx (column containers)');
}

console.log('\n✨ Remaining cards updated!\n');
console.log('📝 Note: BoardClient.tsx task cards (lines 264-281) still need manual update.');
console.log('   See CARD_REDESIGN_GUIDE.md for the exact code to use.\n');
