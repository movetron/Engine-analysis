// electron/build.ts
import * as ts from 'typescript';
import * as fs from 'fs';
const mainTs = fs.readFileSync('electron/main.ts', 'utf-8');
const transpiled = ts.transpile(mainTs, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2017,
});

fs.writeFileSync('dist-electron/main.js', transpiled);
console.log('✅ main.js сгенерирован');
