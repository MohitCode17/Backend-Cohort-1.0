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
   * Open a TCP Connection
   */
  const client = net.createConnection({ host: HOST, port: PORT }, () =>
    console.log(`Connected to the TCP Server.`),
  );

  /**
   * Received Username and Token from User
   */
  const username = await rl.question("Enter username: ");
  const token = await rl.question("Enter token: ");

  /**
   * Build the AUTH Command and Send to Server
   */
  const authCommand = buildCommand(
    "AUTH",
    {
      User: username,
      Token: token,
      "Content-Length": 0,
    },
    "",
  );

  /**
   * Send Command To Server
   */
  client.write(authCommand);

  client.on("data", (data) => {
    const response = data.toString();

    const type = getResponseType(response);
    const responseFor = getResponseFor(response);

    /**
     * If Auth Success, Send the JOIN command
     */
    if (type === "OK" && responseFor === "AUTH") {
      isAuthenticated = true;

      const joinCommand = buildCommand(
        "JOIN",
        { User: username, "Content-Length": 0 },
        "",
      );

      client.write(joinCommand);
      return;
    }

    /**
     * If Join Success
     */
    if (type === "OK" && responseFor === "JOIN") {
      isJoined = true;
      console.log("You have joined the chat<�<�");
      rl.prompt();
      return;
    }

    if (type === "MESSAGE") {
      const [headerPart, body] = response.split("\r\n\r\n");
      let sender = "Unknown";

      const headerLines = headerPart.split("\r\n");

      for (const line of headerLines) {
        if (line.startsWith("User:")) {
          sender = line.split(":")[1].trim();
        }
      }

      console.log(`${sender}: ${body}`);
      rl.prompt();
      return;
    }

    if (type === "ERROR") {
      console.error("Server error, closing connection");
      client.end();
    }
  });

  /**
   * line event fire when User Press "ENTER".
   */
  rl.on("line", (line) => {
    const message = line.trim();

    if (message === "/leave") {
      const leaveCommand = buildCommand("LEAVE", { "Content-Length": 0 }, "");

      client.write(leaveCommand);
      console.log("Leaving chat...");
      rl.close();
      return;
    }

    if (!isAuthenticated) {
      console.log("Please authenticate first.");
      return;
    }

    if (!isJoined) {
      console.log("You are not joined yet.");
      rl.prompt();
      return;
    }

    if (!message) {
      rl.prompt();
      return;
    }

    const sendCommand = buildCommand(
      "SEND",
      { "Content-Length": Buffer.byteLength(message, "utf8") },
      message,
    );

    client.write(sendCommand);
    rl.prompt();
  });
}

/**
 * Build Commands For: AUTH/JOIN/SEND/LEAVE
 * CHAT/1.0 <COMMAND>
 * Header1: Value1
 * Header2: Value2
 * Content-Length: 0
 *
 * body
 */
function buildCommand(command, headers, body) {
  const startLine = `CHAT/1.0 ${command}`;
  const headerLines = [];

  for (const key in headers) {
    const header = `${key}:${headers[key]}`;
    headerLines.push(header);
  }

  return `${startLine}\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`;
}

/**
 * Extract the response type from response body
 * type: OK/ERROR/MESSAGE
 */
function getResponseType(response) {
  const lines = response.split("\r\n");
  const firstLine = lines[0];
  return firstLine.split(" ")[1];
}

/**
 * Extract the response-for from response body
 */
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
