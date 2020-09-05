const { GraphQLObjectType, GraphQLString } = require('graphql')

module.exports.query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    hello: {
      type: GraphQLString,
      resolve: async (_, __, context) => {
        console.log(context)
        return 'world'
      },
    },
    getFromRedis: {
      type: GraphQLString,
      args: {
        key: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, { redis: { getAsync } }) => {
        let data

        try {
          data = await getAsync(args.key)
        } catch (err) {
          console.error(`Error when retrieving message from redis: ${err}`)
          throw new Error('Unable to retrieve message from redis.')
        }

        return data
      },
    },
  }),
})
