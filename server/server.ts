import express from 'express'
import path from 'path'

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "client", "build")));
const isDev = process.env.ENV === "development";
console.info(`Starting adam_net (dev: ${isDev})`);
const port = isDev ? 3000 : 80;

const queue: string[] = [];

const scripts = {
  "blood altar: on": {
    color: "red",
    name: "blood_altar: on",
    rpc:
      "rednet.send(rednet.lookup('adam_net', 'blood_altar'), \"redstone.setOutput('back', true)\", 'adam_net')",
  },
  "blood altar: off": {
    color: "red",
    name: "blood_altar: off",
    rpc:
      "rednet.send(rednet.lookup('adam_net', 'blood_altar'), \"redstone.setOutput('back', false)\", 'adam_net')",
  },
  "mob_spawner: off": {
    color: "red",
    name: "mob_spawner: off",
    rpc:
      "rednet.send(rednet.lookup('adam_net', 'mob_spawner'), \"redstone.setOutput('top', true)\nredstone.setOutput('bottom', true)\", 'adam_net')",
  },
  "mob_spawner: on": {
    color: "red",
    name: "mob_spawner: off",
    rpc:
      "rednet.send(rednet.lookup('adam_net', 'mob_spawner'), \"redstone.setOutput('top', false)\nredstone.setOutput('bottom', false)\", 'adam_net')",
  },
};

app.get("/scripts", (req, res) => {
  res.send(scripts);
});

app.get("/pop", (req, res) => {
  console.log(req.headers["user-agent"]);
  if (queue.length) {
    res.send(queue.pop());
  } else {
    // default rpc
    res.send('print("Remote queue empty")');
  }
});

app.post("/push", (req, res) => {
  console.info(`Got rpc call from client - ${req.body.rpc}`);
  queue.push(req.body.rpc);
  res.sendStatus(200);
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

app.listen(port, () => {
  console.log(`adam_net listening on port ${port}`);
});
