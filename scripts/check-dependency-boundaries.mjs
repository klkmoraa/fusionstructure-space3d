import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const defaultRoot = resolve(scriptDirectory, '..');
const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx'];

const toPosix = (value) => value.split(sep).join('/');
const relativePath = (root, value) => toPosix(relative(root, value));
const isInside = (root, value) => {
  const candidate = resolve(value);
  const prefix = `${resolve(root)}${sep}`;
  return candidate === resolve(root) || candidate.startsWith(prefix);
};

const parseArguments = (argumentsList) => {
  const options = { root: defaultRoot, config: undefined, json: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    const value = argumentsList[index + 1];
    if (!['--root', '--config'].includes(argument) || !value) {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
    if (argument === '--root') options.root = resolve(value);
    if (argument === '--config') options.config = resolve(value);
    index += 1;
  }
  options.config ??= resolve(options.root, 'migration', 'dependency-boundaries.json');
  return options;
};

const readConfig = (configPath) => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config?.schemaVersion !== 1 || !Array.isArray(config.rules)) {
    throw new Error('dependency-boundaries.json schemaVersion/rules are invalid');
  }
  return config;
};

const sourceFiles = (root, scope) => {
  const directory = resolve(root, scope);
  if (existsSync(directory) && extname(directory) && sourceExtensions.includes(extname(directory))) return [directory];
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(root, relativePath(root, path));
    return sourceExtensions.includes(extname(entry.name)) ? [path] : [];
  });
};

const literalText = (expression) => expression && ts.isStringLiteralLike(expression) ? expression.text : null;

const importReferences = (source, filePath) => {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const references = [];
  const add = (kind, expression, node) => {
    const specifier = literalText(expression);
    if (specifier === null) {
      references.push({ kind: `${kind}-nonliteral`, specifier: null, line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
      return;
    }
    references.push({ kind, specifier, line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) add('import', node.moduleSpecifier, node);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier) add('export', node.moduleSpecifier, node);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add('import-equals', node.moduleReference.expression, node);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add('import-type', node.argument.literal, node);
    else if (ts.isImportTypeNode(node) && !ts.isLiteralTypeNode(node.argument)) {
      references.push({ kind: 'import-type-nonliteral', specifier: null, line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add('dynamic-import', node.arguments[0], node);
    } else if (ts.isCallExpression(node)
      && ((ts.isIdentifier(node.expression) && node.expression.text === 'require')
        || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'require'))) {
      add('require', node.arguments[0], node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
};

const tsCompilerOptions = (root) => {
  const configPath = resolve(root, 'tsconfig.app.json');
  if (!existsSync(configPath)) return {};
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')); },
  });
  return parsed?.options ?? {};
};

const resolveSpecifier = (root, sourceFile, specifier, compilerOptions) => {
  if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/') && !specifier.startsWith('~/') && !specifier.startsWith('src/')) return null;
  const candidateSpecifier = specifier.startsWith('@/') || specifier.startsWith('~/')
    ? `./${specifier.slice(2)}`
    : specifier.startsWith('src/') ? `./${specifier}` : specifier;
  const resolved = ts.resolveModuleName(candidateSpecifier, sourceFile, {
    ...compilerOptions,
    baseUrl: compilerOptions.baseUrl ?? root,
  }, ts.sys).resolvedModule?.resolvedFileName;
  if (resolved && isInside(root, resolved)) return resolve(resolved);

  const base = candidateSpecifier.startsWith('./src/')
    ? resolve(root, candidateSpecifier.slice(2))
    : resolve(dirname(sourceFile), candidateSpecifier);
  const candidates = [base, ...sourceExtensions.map((extension) => `${base}${extension}`), ...sourceExtensions.map((extension) => resolve(base, `index${extension}`))];
  return candidates.find((candidate) => existsSync(candidate) && isInside(root, candidate)) ?? null;
};

const matchesPath = (root, absolutePath, pattern) => {
  const actual = relativePath(root, absolutePath);
  const normalizedPattern = pattern.replaceAll('\\', '/').replace(/\/$/, '');
  return actual === normalizedPattern || actual.startsWith(`${normalizedPattern}/`);
};

const matchesScope = (root, filePath, scopes) => scopes.some((scope) => matchesPath(root, filePath, scope));

const exceptionMatches = (root, rule, filePath, targetPath, reference) => (rule.exceptions ?? []).some((exception) => {
  const fromMatches = !exception.from || matchesPath(root, filePath, exception.from);
  const targetMatches = !exception.target || matchesPath(root, targetPath, exception.target);
  const kindMatches = !exception.kind || exception.kind === reference.kind;
  return fromMatches && targetMatches && kindMatches;
});

const diagnosticsFor = ({ root, config, compilerOptions = tsCompilerOptions(root) }) => {
  const diagnostics = [];
  for (const rule of config.rules) {
    for (const scope of rule.scope ?? []) {
      for (const filePath of sourceFiles(root, scope)) {
        const fileRelative = relativePath(root, filePath);
        for (const reference of importReferences(readFileSync(filePath, 'utf8'), filePath)) {
          if (reference.specifier === null) {
            diagnostics.push({ code: 'FSDEP-001', rule: rule.id, file: fileRelative, line: reference.line, message: `${reference.kind} must use a literal module specifier` });
            continue;
          }
          const targetPath = resolveSpecifier(root, filePath, reference.specifier, compilerOptions);
          if (!targetPath) continue;
          const localTarget = relativePath(root, targetPath);
          if ((rule.onlyLocalImports ?? []).length > 0 && !rule.onlyLocalImports.some((allowed) => matchesPath(root, targetPath, allowed))) {
            if (!exceptionMatches(root, rule, filePath, targetPath, reference)) {
              diagnostics.push({ code: 'FSDEP-003', rule: rule.id, file: fileRelative, line: reference.line, target: localTarget, message: `${reference.kind} reaches a local module outside the public allowlist` });
            }
          }
          const forbidden = (rule.forbidden ?? []).find((pattern) => matchesPath(root, targetPath, pattern));
          if (forbidden && !exceptionMatches(root, rule, filePath, targetPath, reference)) {
            diagnostics.push({ code: 'FSDEP-002', rule: rule.id, file: fileRelative, line: reference.line, target: localTarget, message: `${reference.kind} reaches forbidden boundary ${forbidden}` });
          }
        }
      }
    }
  }
  return diagnostics;
};

export const checkDependencyBoundaries = ({ root = defaultRoot, configPath = resolve(root, 'migration', 'dependency-boundaries.json') } = {}) => {
  const config = readConfig(configPath);
  return diagnosticsFor({ root: resolve(root), config });
};

const main = () => {
  const options = parseArguments(process.argv.slice(2));
  const diagnostics = checkDependencyBoundaries({ root: options.root, configPath: options.config });
  if (options.json) console.log(JSON.stringify(diagnostics, null, 2));
  else if (diagnostics.length === 0) console.log('Dependency boundary gate passed (Space3D and external handoff).');
  else {
    console.error(`Dependency boundary gate failed with ${diagnostics.length} diagnostic(s):`);
    for (const diagnostic of diagnostics) {
      const target = diagnostic.target ? ` -> ${diagnostic.target}` : '';
      console.error(`${diagnostic.code} ${diagnostic.rule} ${diagnostic.file}:${diagnostic.line}${target}: ${diagnostic.message}`);
    }
  }
  if (diagnostics.length > 0) process.exitCode = 1;
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
