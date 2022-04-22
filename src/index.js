import express from "express"
import { promisify } from "util"
import redis from "redis"
import mongoose from "mongoose"

let PORT = 80
let REDIS_PATH = ""
let MONGO_URL_PRIMARY = ""
let MONGO_URL_REPL = ""

if (process.env.NODE_ENV !== "production") {
  PORT = 8080
  REDIS_PATH = "redis://44.204.86.55:6379"
  MONGO_URL_PRIMARY = "mongodb://3.82.232.239:27017/monday"
  MONGO_URL_REPL = "mongodb://3.82.232.239:27018/monday"
}

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
// REDIS
;async () => {
  // Create clients
  const redisPub = redis.createClient({
    url: REDIS_PATH,
  })
  const redisSub = redis.createClient({
    url: REDIS_PATH,
  })
  // Error and Ready
  redisPub.on("error", (err) => {
    console.log("error connecting to redis", err)
  })
  redisSub.on("error", (err) => {
    console.log("error connecting to redis", err)
  })
  redisPub.on("ready", () => {
    console.log("connected to redis")
  })
  redisSub.on("ready", () => {
    console.log("connected to redis")
  })
  // connect
  await redisPub.connect()
  await redisSub.connect()
  await redisSub.subscribe("team-timeouts", (message, chan) => {
    // publish viewer-event in mongo
  })
  // Mongo
  // track the teams
  TEAM_REPL.watch().on("change", (data) => {
    // set redis teams
    // publish teams to teams channel
    console.log("data", data)
  })
  // track the players
  PLAYER_REPL.watch().on("change", (data) => {
    // set redis players
    // publish players to players channel
    console.log("data", data)
  })
  // track the settings
  SETTINGS_REPL.watch().on("change", (data) => {
    // set redis settings
    // publish settings to the settings channel
    console.log("data", data)
  })
  const app = express()
  app.listen(PORT, () => console.log(`listening on port ${PORT}`))
}
