const { GraphQLObjectType, GraphQLString } = require('graphql')

const REDIS_PUSHED = 'notification'

module.exports.subscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: () => ({
        itemPushedToRedis: {
            type: new GraphQLObjectType({
                name: 'RedisPushInfo',
                fields: () => ({
                    key: {
                        type: GraphQLString,
                        resolve: async ({ key }) => {
                            return key
                        }
                    },
                    value: {
                        type: GraphQLString,
                        resolve: async ({ value }) => {
                            return value
                        }
                    }
                }),
            }),
            resolve: async (data) => {
                return data
            },
            subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(REDIS_PUSHED)
        }
    })
})