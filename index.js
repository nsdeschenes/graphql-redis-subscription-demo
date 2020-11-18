const http = require('http')
const redis = require('redis')
const { promisify } = require('util')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const { GraphQLSchema, execute, subscribe } = require('graphql')
const { createServer } = require('graphql-ws')

const { query } = require('./src/query')
const { mutation } = require('./src/mutation')
const { subscription } = require('./src/subscription')

const express = require('express')

const { graphqlHTTP } = require('express-graphql')

const schema = new GraphQLSchema({
  query: query,
  mutation: mutation,
  subscription: subscription,
})

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

  const app = express()

  app.get('/alive', (_req, res) => {
    res.json({ ok: 'yes' })
  })
  app.get('/ready', (_req, res) => {
    res.json({ ok: 'yes' })
  })

  app.use(
    '/graphql',
    graphqlHTTP(async (request, response, graphqlParams) => ({
      graphiql: false,
      schema,
      context: {
        request,
        response,
        graphqlParams,
        pubsub,
        redis: { redis, client, getAsync, setAsync },
      },
    })),
  )

  const server = http.createServer(app)

  server.listen(3000, () => {
    createServer(
      {
        schema,
        execute,
        subscribe,
      },
      {
        server,
        path: '/graphql',
      },
    )
  })

  console.info('Listening on http://localhost:3000/graphql')
})()
