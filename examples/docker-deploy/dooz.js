const tagIsNotLatest = {
  name: 'tagIsNotLatest',
  description: 'Do not push images tagged "latest" — use a versioned tag instead (e.g. 1.4.2)',
  requires: ['tag'],
  validate: async (context) => {
    return String(context.args.tag) !== 'latest'
  },
}

export default {
  validators: [tagIsNotLatest],
}
