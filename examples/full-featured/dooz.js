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
    const isCorePackage = packageName === 'core'
    const kind = isCorePackage ? 'run' : 'exec'
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
    const fallbackMetadata = { region: 'unknown', cluster: 'unknown' }
    const resolvedMetadata = environmentMetadata[environment] ?? fallbackMetadata
    return resolvedMetadata
  },
}

// ── Validators ────────────────────────────────────────────────────────────────

const packageExists = {
  name: 'packageExists',
  description: 'Package must be one of: ' + KNOWN_PACKAGES.join(', '),
  requires: ['name'],
  validate: async (context) => {
    const packageName = String(context.args.name)
    const isKnownPackage = KNOWN_PACKAGES.includes(packageName)
    return isKnownPackage
  },
}

const environmentExists = {
  name: 'environmentExists',
  description: 'Environment must be one of: ' + KNOWN_ENVIRONMENTS.join(', '),
  requires: ['environment'],
  validate: async (context) => {
    const environment = String(context.args.environment)
    const isKnownEnvironment = KNOWN_ENVIRONMENTS.includes(environment)
    return isKnownEnvironment
  },
}

const serviceExists = {
  name: 'serviceExists',
  description: 'Service must be one of: ' + KNOWN_SERVICES.join(', '),
  requires: ['service'],
  validate: async (context) => {
    const service = String(context.args.service)
    const isKnownService = KNOWN_SERVICES.includes(service)
    return isKnownService
  },
}

// ── Filters ───────────────────────────────────────────────────────────────────

const kebab = {
  name: 'kebab',
  apply: (value) => {
    const stringValue = String(value)
    const lowercased = stringValue.toLowerCase()
    const kebabValue = lowercased.replaceAll(' ', '-')
    return kebabValue
  },
}

const truncate = {
  name: 'truncate',
  apply: (value, length) => {
    const stringValue = String(value)
    const maxLength = Number(length) || 20
    const isTooLong = stringValue.length > maxLength
    if (!isTooLong) return stringValue
    const truncatedValue = stringValue.slice(0, maxLength) + '...'
    return truncatedValue
  },
}

// ── Exports ───────────────────────────────────────────────────────────────────

export default {
  resolvers: [packageKind, environmentInfo],
  validators: [packageExists, environmentExists, serviceExists],
  filters: [kebab, truncate],
}
