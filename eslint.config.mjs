import nextConfig from 'eslint-config-next'

const noHardcodedHexRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hardcoded hex color literals — use design tokens instead' },
    messages: {
      noHex: 'Hardcoded hex "{{ value }}" — use a token from tokens/tokens.ts or var(--color-*).',
    },
  },
  create(context) {
    const HEX_RE = /#[0-9a-fA-F]{3,8}\b/

    function check(node, value) {
      if (typeof value === 'string' && HEX_RE.test(value))
        context.report({ node, messageId: 'noHex', data: { value: value.trim() } })
    }

    return {
      Literal(node) { check(node, node.value) },
      TemplateElement(node) { check(node, node.value?.raw) },
    }
  },
}

export default [
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  {
    // tokens/tokens.ts is excluded — it IS the source of hex values
    ignores: ['tokens/tokens.ts'],
    plugins: {
      local: {
        rules: { 'no-hardcoded-hex': noHardcodedHexRule },
      },
    },
    rules: {
      'local/no-hardcoded-hex': 'error',
    },
  },
]
