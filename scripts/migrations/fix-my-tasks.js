const fs = require('fs');

console.log('🔧 Fixing my-tasks/page.tsx...\n');

const myTasksPath = 'src/app/my-tasks/page.tsx';
if (fs.existsSync(myTasksPath)) {
  let content = fs.readFileSync(myTasksPath, 'utf8');

  // Use regex to find and replace the card className
  content = content.replace(
    /className="block nb-card rounded-lg p-4 hover:bg-white\/5 transition-colors border border-white\/10"/g,
    'className="block nb-card rounded-xl p-5 group"'
  );

  // Update typography
  content = content.replace(
    /<h3 className="font-medium truncate">/g,
    '<h3 className="font-semibold truncate">'
  );

  // Update column name chip styling
  content = content.replace(
    /className="px-2 py-0\.5 text-xs rounded nb-chip-teal flex-shrink-0"/g,
    'className="px-2.5 py-1 text-xs rounded-full nb-chip-teal flex-shrink-0 font-medium"'
  );

  // Update description styling
  content = content.replace(
    /<p className="text-sm opacity-70 line-clamp-2">/g,
    '<p className="text-sm opacity-60 line-clamp-2 leading-relaxed">'
  );

  // Update spacing
  content = content.replace(
    /gap-2 mb-1/g,
    'gap-2 mb-2'
  );

  content = content.replace(
    /gap-2 flex-shrink-0/g,
    'gap-3 flex-shrink-0'
  );

  fs.writeFileSync(myTasksPath, content, 'utf8');
  console.log('✓ Updated my-tasks/page.tsx\n');
} else {
  console.log('✗ my-tasks/page.tsx not found\n');
}
