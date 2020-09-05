const { GraphQLObjectType, GraphQLString } = require('graphql')

module.exports.mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    pushToRedis: {
      type: GraphQLString,
      args: {
        key: {
          type: GraphQLString,
        },
        value: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, { redis: { redis, setAsync } }) => {
        try {
          await setAsync(args.key, args.value)
        } catch (err) {
          console.error(`Redis Error: ${err}`)
          throw new Error('Unable to send message to redis.')
        }

        const publisher = redis.createClient()
        try {
          publisher.publish(
            'notification',
            JSON.stringify({ key: args.key, value: args.value }),
          )
        } catch (err) {
          console.error(`Redis publish error: ${err}`)
          throw new Error('Unable to publish message to redis.')
        }

        publisher.quit()

        return 'Sent To Redis'
      },
    },
  }),
})
