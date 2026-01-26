import net from "node:net";
import readline from "node:readline/promises";

const HOST = "localhost";
const PORT = 1337;

async function startChat() {
  let isAuthenticated = false;
  let isJoined = false;
  /**
   * Using CLI Based User Interface
   */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ">",
  });

  /**
   * Protocol Flow
   * 1. Open a TCP Connection
   */
  const client = net.createConnection({ host: HOST, port: PORT }, () => {
    console.log("Connected to the server");
  });

  /**
   * Get username and token
   */
  const username = await rl.question("Enter username: ");
  const token = await rl.question("Enter token: ");

  /**
   * Prepare AUTH Command
   */
  const authCommand = buildCommand(
    "AUTH",
    {
      User: username,
      Token: token,
      "content-length": 0,
    },
    "",
  );

  /**
   * Send Command to Server
   */
  client.write(authCommand);

  /**
   * Event: When data received data from server
   * Server response for Auth/JOIN/SEND/LEAVE
   */
  client.on("data", (data) => {
    const response = data.toString();
    console.log(response);

    const type = getResponseType(response);
    const responseFor = getResponseFor(response);

    // AUTH success
    if (type === "OK" && responseFor === "AUTH") {
      isAuthenticated = true;

      const joinCommand = buildCommand(
        "JOIN",
        {
          User: username,
          "Content-Length": 0,
        },
        "",
      );

      client.write(joinCommand);
      return;
    }

    // JOIN success
    if (type === "OK" && responseFor === "JOIN") {
      isJoined = true;
      console.log("You have joined the chat 🎉");
      rl.prompt();
      return;
    }

    if (type === "MESSAGE") {
      const body = response.split("\r\n\r\n")[1];
      console.log(body);
      rl.prompt();
      return;
    }

    // ERROR handling
    if (type === "ERROR") {
      console.log("Server error, closing connection");
      client.end();
    }
  });

  rl.on("line", (line) => {
    const input = line.trim();

    // LEAVE command
    if (input === "/leave") {
      const leaveCommand = buildCommand("LEAVE", { "Content-Length": 0 }, "");

      client.write(leaveCommand);
      console.log("Leaving chat...");
      rl.close();
      return;
    }

    // Jab tak JOIN na ho, SEND allow nahi
    if (!isJoined) {
      console.log("You are not joined yet.");
      rl.prompt();
      return;
    }

    const message = line.trim();

    if (!message) {
      rl.prompt();
      return;
    }

    const sendCommand = buildCommand(
      "SEND",
      {
        "Content-Length": Buffer.byteLength(message, "utf8"),
      },
      message,
    );

    client.write(sendCommand);
    rl.prompt();
  });
}

function buildCommand(command, headers, body) {
  /*
   * CHAT/1.0 AUTH
   * User: alice
   * Token: secret123
   * Content-Length: 0
   *
   * body
   */
  const startLine = `CHAT/1.0 ${command}`;
  const headerLines = [];

  for (const key in headers) {
    const header = `${key}:${headers[key]}`;
    headerLines.push(header);
  }

  return `${startLine}\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`;
}

function getResponseType(response) {
  const lines = response.split("\r\n");
  const firstLine = lines[0]; // CHAT/1.0 OK / ERROR / MESSAGE
  return firstLine.split(" ")[1];
}

function getResponseFor(response) {
  const lines = response.split("\r\n");
  for (const line of lines) {
    if (line.startsWith("Response-For")) {
      return line.split(":")[1].trim();
    }
  }
  return null;
}

startChat();
