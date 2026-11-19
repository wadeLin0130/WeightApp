export function calculate(expression) {
  const source = String(expression).replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '');
  if (!source || source.length > 80) throw new Error('請輸入數值');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+|[+\-*/])/g);
  if (!tokens || tokens.join('') !== source) throw new Error('算式不完整');
  let position = 0;
  function number() {
    if (tokens[position] === '+') { position++; return number(); }
    if (tokens[position] === '-') { position++; return -number(); }
    const token = tokens[position++];
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('算式不完整');
    return Number(token);
  }
  function product() {
    let value = number();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++], right = number();
      if (operator === '/' && right === 0) throw new Error('不能除以 0');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }
  let value = product();
  while (tokens[position] === '+' || tokens[position] === '-') {
    const operator = tokens[position++], right = product();
    value = operator === '+' ? value + right : value - right;
  }
  if (position !== tokens.length || !Number.isFinite(value)) throw new Error('算式不完整');
  return Math.round((value + Number.EPSILON) * 1e8) / 1e8;
}
