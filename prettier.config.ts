const importRoots = Object.values({
  public: '/',
  external: '^~.',
  absolute: '~',
  relative: '.',
})

const styleImports = importRoots.map((root) => `^[${root}].*\\.css$`)
const scriptImports = importRoots.map((root) => `^[${root}]`)

const importOrder = [...styleImports, '', ...scriptImports]

export default {
  semi: false,
  singleQuote: true,
  jsxSingleQuote: true,
  plugins: [
    '@ianvs/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder,
  tailwindFunctions: ['cn'],
}
