const fs = require('fs');

console.log('🔧 Fixing board card button overflow...\n');

const boardsPagePath = 'src/app/boards/page.tsx';
if (fs.existsSync(boardsPagePath)) {
  let content = fs.readFileSync(boardsPagePath, 'utf8');

  // Use regex to replace more flexibly
  const pattern = /<div className="flex items-center gap-2 mt-4">[\s\S]*?<\/div>\s*\{openMembers\[p\.projectId\]/;

  const newSection = `<div className="space-y-3">
                <Link
                  href={\`/boards/\${p.projectId}\`}
                  className="w-full h-10 px-4 rounded-lg nb-btn-primary flex items-center justify-center font-medium"
                >
                  Open Board
                </Link>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const isOpen = openMembers[p.projectId];
                      const next = { ...openMembers, [p.projectId]: !isOpen };
                      setOpenMembers(next);
                      if (!isOpen && !profiles[p.projectId]) {
                        const pf = await getUsersByIds(p.members);
                        setProfiles((prev) => ({ ...prev, [p.projectId]: pf }));
                      }
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary hover:bg-white/5"
                  >
                    {openMembers[p.projectId] ? "Hide" : "Members"}
                  </button>
                  <button
                    onClick={async () => {
                      const name = prompt("Rename board", p.name);
                      if (!name) return;
                      await renameProject(p.projectId, name);
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary hover:bg-white/5"
                  >
                    Rename
                  </button>
                  {user.uid === p.ownerId && (
                    <>
                      <button
                        onClick={async () => {
                          const email = prompt("Add member by email");
                          if (!email) return;
                          try {
                            await addMemberByEmail(p.projectId, email.trim());
                          } catch (e: unknown) {
                            const msg = (e as Error)?.message || "Failed to add member";
                            alert(msg);
                          }
                        }}
                        className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary hover:bg-white/5"
                      >
                        Add
                      </button>
                      <button
                        onClick={async () => {
                          const email = prompt("Remove member by email");
                          if (!email) return;
                          try {
                            await removeMemberByEmail(p.projectId, email.trim());
                          } catch (e: unknown) {
                            const msg = (e as Error)?.message || "Failed to remove member";
                            alert(msg);
                          }
                        }}
                        className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary hover:bg-white/5"
                      >
                        Remove
                      </button>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm("Archive this board?")) return;
                      await archiveProject(p.projectId);
                    }}
                    className="flex-1 min-w-[100px] h-9 px-3 rounded-lg text-sm nb-btn-secondary hover:bg-white/5"
                  >
                    Archive
                  </button>
                </div>
              </div>
              {openMembers[p.projectId]`;

  if (pattern.test(content)) {
    content = content.replace(pattern, newSection);
    fs.writeFileSync(boardsPagePath, content, 'utf8');
    console.log('✓ Fixed board card button layout\n');
    console.log('Changes made:');
    console.log('  • "Open" button now full-width and prominent');
    console.log('  • Other buttons in flex-wrap layout (prevents overflow)');
    console.log('  • Buttons use flex-1 with min-width to wrap gracefully');
    console.log('  • Shortened text ("Add member" → "Add", "Hide members" → "Hide")');
    console.log('  • All buttons now use rounded-lg for consistency');
    console.log('  • Small text-sm for secondary buttons\n');
  } else {
    console.log('⚠ Could not find button section pattern\n');
  }
} else {
  console.log('✗ boards/page.tsx not found\n');
}
