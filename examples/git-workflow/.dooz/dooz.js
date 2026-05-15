const kebab = {
  name: 'kebab',
  apply: (value) => {
    const stringValue = String(value)
    const lowercased = stringValue.toLowerCase()
    const kebabValue = lowercased.replaceAll(' ', '-')
    return kebabValue
  },
}

const isSemanticVersion = {
  name: 'isSemanticVersion',
  description: 'Version must follow semantic versioning — e.g. 1.2.3',
  requires: ['version'],
  validate: async (context) => {
    const semverPattern = /^\d+\.\d+\.\d+$/
    const version = String(context.args.version)
    const isValidSemver = semverPattern.test(version)
    return isValidSemver
  },
}

export default {
  filters: [kebab],
  validators: [isSemanticVersion],
}
