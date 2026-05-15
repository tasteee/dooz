const KNOWN_PACKAGES = ['ui', 'core', 'api', 'utils', 'config']

const packageExists = {
  name: 'packageExists',
  description: 'Package must exist in the workspace',
  requires: ['name'],
  validate: async (context) => {
    const packageName = String(context.args.name)
    const isKnownPackage = KNOWN_PACKAGES.includes(packageName)
    return isKnownPackage
  },
}

export default {
  validators: [packageExists],
}
