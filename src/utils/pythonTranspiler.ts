/**
 * A lightweight client-side Python to JavaScript transpiler for 3D animations.
 * Translates standard Python syntax (indentation blocks, logical keywords, and math functions)
 * into high-performance JavaScript expressions.
 */
export function transpilePythonToJS(pythonCode: string): string {
  if (!pythonCode || pythonCode.trim() === '') return '';

  const lines = pythonCode.split('\n');
  const jsLines: string[] = [];
  
  // Track indentation stack
  const indentStack: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    
    // Skip completely empty lines
    if (rawLine.trim() === '') {
      jsLines.push('');
      continue;
    }

    // Determine indentation
    const indentMatch = rawLine.match(/^(\s*)/);
    const indentSpaces = indentMatch ? indentMatch[1].length : 0;
    let trimmedLine = rawLine.trim();

    // Check if indentation decreased
    let lastIndent = indentStack[indentStack.length - 1];
    while (indentSpaces < lastIndent) {
      indentStack.pop();
      lastIndent = indentStack[indentStack.length - 1];
      jsLines.push(' '.repeat(lastIndent) + '}');
    }

    // Handle comment replacement: # -> //
    if (trimmedLine.startsWith('#')) {
      jsLines.push(' '.repeat(indentSpaces) + '//' + trimmedLine.substring(1));
      continue;
    }

    // Translate Python imports
    if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
      jsLines.push(' '.repeat(indentSpaces) + '// ' + trimmedLine);
      continue;
    }

    // Replace Python Logical Operators & Constants
    trimmedLine = trimmedLine
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!');

    // Replace Python math library functions with JavaScript Math
    trimmedLine = trimmedLine
      .replace(/\bmath\.sin\b/g, 'Math.sin')
      .replace(/\bmath\.cos\b/g, 'Math.cos')
      .replace(/\bmath\.tan\b/g, 'Math.tan')
      .replace(/\bmath\.abs\b/g, 'Math.abs')
      .replace(/\bmath\.sqrt\b/g, 'Math.sqrt')
      .replace(/\bmath\.pow\b/g, 'Math.pow')
      .replace(/\bmath\.log\b/g, 'Math.log')
      .replace(/\bmath\.exp\b/g, 'Math.exp')
      .replace(/\bmath\.pi\b/g, 'Math.PI')
      .replace(/\bmath\.floor\b/g, 'Math.floor')
      .replace(/\bmath\.ceil\b/g, 'Math.ceil')
      .replace(/\bmath\.round\b/g, 'Math.round');

    // Handle if/elif/else block statements (ending with :)
    if (trimmedLine.endsWith(':')) {
      const statement = trimmedLine.slice(0, -1).trim();
      indentStack.push(indentSpaces + 4); // push expected next indent

      if (statement.startsWith('if ')) {
        const cond = statement.substring(3).trim();
        jsLines.push(' '.repeat(indentSpaces) + `if (${cond}) {`);
      } else if (statement.startsWith('elif ')) {
        const cond = statement.substring(5).trim();
        jsLines.push(' '.repeat(indentSpaces) + `else if (${cond}) {`);
      } else if (statement === 'else') {
        jsLines.push(' '.repeat(indentSpaces) + 'else {');
      } else {
        // Fallback for custom blocks
        jsLines.push(' '.repeat(indentSpaces) + `${statement} {`);
      }
    } else {
      jsLines.push(' '.repeat(indentSpaces) + trimmedLine);
    }
  }

  // Close remaining indentation levels
  while (indentStack.length > 1) {
    indentStack.pop();
    const lastIndent = indentStack[indentStack.length - 1];
    jsLines.push(' '.repeat(lastIndent) + '}');
  }

  return jsLines.join('\n');
}
