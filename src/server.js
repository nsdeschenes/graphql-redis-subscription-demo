const express = require('express')
const { GraphQLSchema } = require('graphql')
import { createServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
const { graphqlHTTP } = require('express-graphql')
 
const { query } = require('./query')
const { mutation } = require('./mutation')
const { subscription } = require('./subscription')

const Server = (context = {}) => {
  const app = express()

  app.get('/alive', (_req, res) => {
    res.json({ ok: 'yes' })
  })
  app.get('/ready', (_req, res) => {
    res.json({ ok: 'yes' })
  })

  app.use('/graphql', graphqlHTTP(async (request, response, graphqlParams) => ({
    schema: new GraphQLSchema({
      query: query,
      mutation: mutation,
      subscription: subscription,
    }),
    context: {
      request,
      response,
      graphqlParams,
      ...context,
    },
  })))

  const server = https.createServer(app)

  return server
}

module.exports = {
  Server,
}
