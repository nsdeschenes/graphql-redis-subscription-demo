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
        const data = await getAsync(args.key)

        return data
      },
    },
  }),
})
