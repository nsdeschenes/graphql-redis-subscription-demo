const express = require('express')
const http = require('http')
const redis = require('redis')
const { promisify } = require('util')
const { graphqlHTTP } = require('express-graphql')
const { RedisPubSub } = require('graphql-redis-subscriptions')
const { GraphQLSchema, execute, subscribe } = require('graphql')
const { createServer } = require('graphql-ws')
const expressPlayground = require('graphql-playground-middleware-express')
  .default

const { query } = require('./src/query')
const { mutation } = require('./src/mutation')
const { subscription } = require('./src/subscription')

const PORT = 3000

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

  app.get(
    '/graphql',
    expressPlayground({
      endpoint: '/graphql',
      subscriptionEndpoint: '/graphql',
      
    }),
  )

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

  server.listen(PORT, () => 
    createServer(
      {
        context: async (ctx, msg, args) => {
          console.log(ctx)
          console.log(msg)
          console.log(args)
          return { ctx, msg, args }
        },
        schema,
        execute,
        subscribe,
        onConnect: (ctx) => {
          console.log('Connect', ctx)
        },
        onError: (err) => {
          console.log(err)
        },
      },
      {
        server,
        path: '/graphql',
      },
    ),
  )

  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`)
})()
