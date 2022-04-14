import express from "express"
import { promisify } from "util"
import redis from "redis"
import mongoose from "mongoose"

const PORT = 8080
const REDIS_HOST = ""
const REDIS_PORT = 6379
const MONGO_URL_PRIMARY = ""
const MONGO_URL_REPL = ""

// REDIS
const redisPub = redis.createClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
})
const redisSub = redis.createClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

// MONGO
let primary = mongoose.createConnection(MONGO_URL_PRIMARY, {
  useNewUrlParser: true,
})
let repl = mongoose.createConnection(MONGO_URL_REPL, {
  useNewUrlParser: true,
})

// MONGO MODELS
// should edit the viewer events
const VIEWER_EVENTS = primary.model("ViewerEvents", {
  team: String,
  timestamp: String,
})
// should track the teams, players, and Viewer settings
const TEAM_REPL = repl.model("Team", {
  name: String,
  players: String,
})
const PLAYER_REPL = repl.model("Player", {
  name: String,
})
const VIEWER_SETTINGS = repl.model("ViewerSettings", {
  viewerTimeout: String,
  threshold: String,
  teamCooldown: String,
})

// APP LOGIC

// Redis
// track the teams on redis
redisSub.on("testKey", (key, value) => {
  console.log("key", key, "value", value)
})
// publish to redis when teams change
redisPub.publish("testkey", "testvalue")
// publish to redis when players change
// publish to redis when threshold is hit
// publish to redis when settings are changed

// Mongo
// track the teams
TEAM_REPL.watch().on("change", (data) => console.log("data", data))
// track the players
// track the settings
// publish an event when threshold is hit

const app = express()

app.listen(PORT, () => console.log(`listening on port ${PORT}`))
