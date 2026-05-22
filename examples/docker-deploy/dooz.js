const tagIsNotLatest = {
  name: 'tagIsNotLatest',
  description: 'Do not push images tagged "latest" — use a versioned tag instead (e.g. 1.4.2)',
  requires: ['tag'],
  validate: async (context) => {
    const tag = String(context.args.tag)
    const isNotLatest = tag !== 'latest'
    return isNotLatest
  },
}

export default {
  validators: [tagIsNotLatest],
}
