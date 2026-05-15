const KNOWN_PACKAGES = ['ui', 'core', 'api', 'utils', 'config']

const packageExists = {
  name: 'packageExists',
  description: 'Package must exist in the workspace',
  requires: ['name'],
  validate: async (context) => {
    return KNOWN_PACKAGES.includes(String(context.args.name))
  },
}

export default {
  validators: [packageExists],
}
