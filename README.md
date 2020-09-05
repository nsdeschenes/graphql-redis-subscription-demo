# GraphQL Subscriptions With Redis

This is a simple GraphQL API demo example testing to see the possibility of having a Redis pubsub trigger a GraphQL subscription.

To demo this possibility I am using the [`graphql-redis-subscriptions`](https://github.com/davidyaha/graphql-redis-subscriptions) pubsub engine. The reason behind using this package rather than creating our own implementation with the `apollo-server` base `PubSub` object is detailed here in the `apollo-server` [documents](https://www.apollographql.com/docs/apollo-server/data/subscriptions/#pubsub-implementations).

For the actual implementation in tracker, I am planning on using a `UUID` that is added onto the channel as show [here](https://github.com/davidyaha/graphql-redis-subscriptions#dynamically-create-a-topic-based-on-subscription-args-passed-on-the-query), this will give the API the ability to ensure that the user that requested the scan, gets the correct results back. The actual `UUID` will be randomly generated during the `requestScan` mutation and sent to the frontend, will be used as an argument in the subscription.

[Running the demo](#Running-this-demo)

### Creating the PubSub, and Client
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

### Mutation Details
```javascript
// mutation.js
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

### Subscription Details
```javascript
// subscriptions.js
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

---

## Running this demo
### Start Redis Docker Image
```cmd
docker run -d --network=host --name test-redis redis
```

### Install dependencies
```cmd
npm install --save
```

### Running the server
```cmd
npm run start
```

### Demo functions
Ensure that you open different tabs in graphql-playground for each of the following.
#### Start Subscription
```graphql
subscription {
  itemPushedToRedis {
    key
    value
  }
}
```
![](https://user-images.githubusercontent.com/7891920/92303547-41e06780-ef4c-11ea-93ea-32f69815a3c9.png)

#### Execute Mutation
When the mutation is executed you will see the key and value that you submitted as arguments appear in the subscriptions results.
```graphql
mutation {
  pushToRedis(key: "Key1", value: "First Test Data")
}
```
![](https://user-images.githubusercontent.com/7891920/92303561-5b81af00-ef4c-11ea-98c1-53cb8142cc57.png)


#### Execute Query
When you execute the query, you will retrieve the value from the cache corresponding with the key that you executed the mutation with.
```graphql
query {
  getFromRedis (key: "Key1")
}
```
![](https://user-images.githubusercontent.com/7891920/92303569-6f2d1580-ef4c-11ea-9e75-6f2a366669b6.png)