// ── Constants ─────────────────────────────────────────────────────────────────

const KNOWN_PACKAGES = ['core', 'ui', 'api', 'utils']
const KNOWN_ENVIRONMENTS = ['staging', 'production', 'preview']
const KNOWN_SERVICES = ['web', 'worker', 'api']

// ── Resolvers ─────────────────────────────────────────────────────────────────

const packageKind = {
  name: 'packageKind',
  description: 'Decide whether a package uses "run" or "exec" to invoke its test script',
  requires: ['name'],
  provides: ['kind'],
  resolve: async (context) => {
    const packageName = String(context.args.name)
    const kind = packageName === 'core' ? 'run' : 'exec'
    return { kind }
  },
}

const environmentInfo = {
  name: 'environmentInfo',
  description: 'Look up the AWS region and cluster name for a deployment environment',
  requires: ['environment'],
  provides: ['region', 'cluster'],
  resolve: async (context) => {
    const environment = String(context.args.environment)
    const environmentMetadata = {
      staging: { region: 'us-east-1', cluster: 'staging-cluster' },
      production: { region: 'us-west-2', cluster: 'prod-cluster' },
      preview: { region: 'us-east-1', cluster: 'preview-cluster' },
    }
    const resolvedMetadata = environmentMetadata[environment] ?? { region: 'unknown', cluster: 'unknown' }
    return resolvedMetadata
  },
}

// ── Validators ────────────────────────────────────────────────────────────────

const packageExists = {
  name: 'packageExists',
  description: 'Package must be one of: ' + KNOWN_PACKAGES.join(', '),
  requires: ['name'],
  validate: async (context) => {
    return KNOWN_PACKAGES.includes(String(context.args.name))
  },
}

const environmentExists = {
  name: 'environmentExists',
  description: 'Environment must be one of: ' + KNOWN_ENVIRONMENTS.join(', '),
  requires: ['environment'],
  validate: async (context) => {
    return KNOWN_ENVIRONMENTS.includes(String(context.args.environment))
  },
}

const serviceExists = {
  name: 'serviceExists',
  description: 'Service must be one of: ' + KNOWN_SERVICES.join(', '),
  requires: ['service'],
  validate: async (context) => {
    return KNOWN_SERVICES.includes(String(context.args.service))
  },
}

// ── Filters ───────────────────────────────────────────────────────────────────

const kebab = {
  name: 'kebab',
  apply: (value) => {
    return String(value).toLowerCase().replaceAll(' ', '-')
  },
}

const truncate = {
  name: 'truncate',
  apply: (value, length) => {
    const stringValue = String(value)
    const maxLength = Number(length) || 20
    const isTooLong = stringValue.length > maxLength
    if (!isTooLong) return stringValue
    return stringValue.slice(0, maxLength) + '...'
  },
}

// ── Exports ───────────────────────────────────────────────────────────────────

export default {
  resolvers: [packageKind, environmentInfo],
  validators: [packageExists, environmentExists, serviceExists],
  filters: [kebab, truncate],
}
