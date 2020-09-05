const redis = require('redis')
const { promisify } = require('util')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const PORT = 4000

const { Server } = require('./src/server')

;(async () => {
  const pubsub = new RedisPubSub({
    publisher: redis.createClient(),
    subscriber: redis.createClient(),
  })

  const client = redis.createClient()

  client.on('error', function (error) {
    console.error(error)
  })

  const getAsync = promisify(client.get).bind(client)
  const setAsync = promisify(client.set).bind(client)

  Server({ pubsub, redis: { redis, client, getAsync, setAsync } }).listen(
    PORT,
    (err) => {
      if (err) throw err
    },
  )
})()
