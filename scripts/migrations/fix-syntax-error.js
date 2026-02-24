const fs = require('fs');

console.log('🔧 Fixing final syntax error in BoardClient.tsx...\n');

const boardClientPath = 'src/app/boards/[id]/BoardClient.tsx';
if (fs.existsSync(boardClientPath)) {
  let content = fs.readFileSync(boardClientPath, 'utf8');

  // Fix the extra closing brace: }})() should be })()
  content = content.replace(/\}\}\)\(\)\}/g, '})()}');

  fs.writeFileSync(boardClientPath, content, 'utf8');
  console.log('✓ Fixed extra closing brace!\n');
  console.log('Changed: }})()  →  })()');
  console.log('\nThe board page should now parse correctly.\n');
} else {
  console.log('✗ BoardClient.tsx not found\n');
}
