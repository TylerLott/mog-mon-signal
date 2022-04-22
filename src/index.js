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
  active: Boolean,
})

// should track the teams, players, and Viewer settings
const TEAM_REPL = repl.model(
  "team",
  {
    name: String,
    players: [String],
    createdBy: String,
  },
  "teams"
)

const PLAYER_REPL = repl.model(
  "user",
  {
    _id: String,
    type: String,
    streamerName: String,
    gameName: String,
    attributes: {
      kills: Number,
      placement: Number,
    },
    active: Boolean,
  },
  "users"
)
const SETTINGS_REPL = repl.model(
  "setting",
  {
    viewerTimeout: String,
    threshold: String,
    teamCooldown: String,
  },
  "settings"
)
;(async () => {
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
    let mes = JSON.parse(message)
    if (mes.val > 0) {
      let event = new VIEWER_EVENTS({
        team: mes.team,
        active: true,
      })
      event.save()
      let sets = SETTINGS_REPL.findOne()
      setTimeout(async () => {
        VIEWER_EVENTS.updateOne(
          { team: mes.team },
          {
            active: false,
          }
        )
        redisPub.publish(
          "team-timeouts",
          JSON.stringify({ team: mes.team, val: 0 })
        )
      }, sets.teamCooldown)
    }
  })
  // Mongo
  // track the teams
  TEAM_REPL.watch().on("change", async (data) => {
    console.log("teams", data)
    if (typeof data === "string" || data instanceof String) {
      console.log("teams change", data)
    } else {
      // set redis settings
      await redisPub.set("teams", JSON.stringify(data.fullDocument))
      redisPub.publish("teams", JSON.stringify(data.fullDocument))
      // publish settings to the settings channel
      console.log("changing players", data)
    }
  })
  // track the players
  PLAYER_REPL.watch().on("change", async (data) => {
    console.log("players", data)
    if (typeof data === "string" || data instanceof String) {
      console.log("players change", data)
    } else {
      // set redis settings
      let plays = PLAYER_REPL.find({ active: true, type: "player" }).then(
        (users) => {
          console.log("setting redis", users)
          redisPub.set("players", JSON.stringify(users)).then(() => {
            redisPub.publish("players", JSON.stringify(users))
          })
          // publish settings to the settings channel
        }
      )
    }
  })
  // track the settings
  SETTINGS_REPL.watch().on("change", async (data) => {
    console.log("settings", data)
    if (data && data.operationType === "insert") {
      if (typeof data === "string" || data instanceof String) {
        console.log("settings change", data)
      } else {
        // set redis settings
        await redisPub.set("settings", JSON.stringify(data.fullDocument))
        redisPub.publish("settings", JSON.stringify(data.fullDocument))
      }
    }
  })
  const app = express()
  app.listen(PORT, () => console.log(`listening on port ${PORT}`))
})()
