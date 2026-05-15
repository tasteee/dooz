const kebab = {
  name: 'kebab',
  apply: (value) => {
    return String(value).toLowerCase().replaceAll(' ', '-')
  },
}

const isSemanticVersion = {
  name: 'isSemanticVersion',
  description: 'Version must follow semantic versioning — e.g. 1.2.3',
  requires: ['version'],
  validate: async (context) => {
    const semverPattern = /^\d+\.\d+\.\d+$/
    return semverPattern.test(String(context.args.version))
  },
}

export default {
  filters: [kebab],
  validators: [isSemanticVersion],
}
