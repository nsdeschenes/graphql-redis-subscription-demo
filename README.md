# GraphQL Subscriptions With Redis

This is a simple GraphQL API demo example testing to see the possibility of having a Redis pubsub trigger a GraphQL subscription.

To demo this possibility I am using the `graphql-redis-subscriptions` pubsub engine. 

```javascript
// index.js
const redis = require('redis')
const { RedisPubSub } = require('graphql-redis-subscriptions')

// ...

const pubsub = new RedisPubSub({
    publisher: redis.createClient(),
    subscriber: redis.createClient()
})

const client = redis.createClient()

client.on("error", function(error) {
    console.error(error);
})

// ...

Server({ pubsub, redis: { redis, client, getAsync, setAsync } }).listen(PORT, (err) => {
    if (err) throw err
})

// ...
```
In [index.js](https://github.com/nslandolt/graphql-redis-subscription-demo/blob/master/index.js) we create the pubsub that we will use in the subscription object type. However to correctly prove that this package is what we are looking for I also pass the redis object into the context for use later on.

---

```javascript
// ...

resolve: async (_, args, { redis: { redis, setAsync } }) => {
    try {
        await setAsync(args.key, args.value)
    } catch (err) {
        console.error(`Redis Error: ${err}`)
    }

    const publisher = redis.createClient()
    publisher.publish("notification", JSON.stringify({ key: args.key, value: args.value}))
    publisher.quit()

    return 'Sent To Redis'
}

// ...
```
In [mutation.js](https://github.com/nslandolt/graphql-redis-subscription-demo/blob/master/src/mutation.js) I create a publisher using the base redis object. The reason I am doing this is to see if the `RedisPubSub` object properly talks to the Redis cache rather than just using a `pubsub.publish()` inside the mutation resolver. I initially set the value in the cache so that we can access it later on using queries, then I publish a message on the `notification` channel with a JSON string, following the publish I close quit the publisher and inform the user that the information has been sent to the cache.

---

```javascript
// ...

const REDIS_PUSHED = 'notification'

// ...

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

// ...
```
In [subscription.js](https://github.com/nslandolt/graphql-redis-subscription-demo/blob/master/src/subscription.js) I define the `itemPushedToRedis` graphql object inside the `subscription` graphql object. The key part of this object is the `subscribe` field at the end of the object. This field returns an `AsyncIterator` which will listen to the `notification` channel in the redis cache. When the `AsyncIterator` is triggered the data that it received is then passed onto the resolver which then in turn resolves the fields in the `RedisPushInfo` object.