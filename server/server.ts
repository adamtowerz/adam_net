import express from 'express'
import path from 'path'
import { getTurtleManager } from './TurtleManager';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "build")));
const isDev = process.env.ENV === "development";
console.info(`Starting adam_net (dev: ${isDev})`);
const port = 80;

const turtleManager = getTurtleManager();

// Serve the FE
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

app.get("/firmware", function (req, res) {
  console.log('fetching firmware')
  res.sendFile(path.join(__dirname, "..", "turtleos", "lib", "startup.lua"));
});

app.get("/firmwareLib", function (req, res) {
  console.log('fetching firmwarelib')
  res.sendFile(path.join(__dirname, "..", "turtleos", "lib", "lualib_bundle.lua"));
});

app.get("/firmwareJson", function (req, res) {
  console.log('fetching firmwarelib')
  res.sendFile(path.join(__dirname, "..", "turtleos", "lualib", "json.lua"));
});

app.get("/firmwareVersion", function (req, res) {
  res.send({
    version: 1
  });
});

app.get("/fleetStatus", function (req, res) {
  res.send(turtleManager.getFleetStatus())
})

app.post("/sendTurtleMessage", function (req, res) {
  const { turtle, message } = req.body;
  const result = turtleManager.sendMessageToTurtle(turtle, message);

  if (result) {
    res.send({
      success: result,
    })
  }
})

app.post("/preemptTurtle", function (req, res) {
  const { turtle } = req.body;
  const result = turtleManager.preemptTurtle(turtle);

  if (result) {
    res.send({
      success: result,
    })
  }
})

app.listen(port, () => {
  console.log(`adam_net listening on port ${port}`);
});
