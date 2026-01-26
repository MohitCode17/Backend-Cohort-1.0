import net from "node:net";

const PORT = 1337;
const clients = [];

const server = net.createServer((socket) => {
  /**
   * Set Socket Encoding
   */
  socket.setEncoding("utf-8");

  /**
   * Maintained State
   */
  socket.authenticated = false;
  socket.joined = false;
  socket.username = "";

  console.log("New client connected...");
  clients.push(socket);

  /**
   * Event: Data received from client
   */
  socket.on("data", (data) => {
    const message = parseMessage(data);

    if (!message) {
      console.error("Invalid message format");
      return;
    }

    handleMessage(socket, message);
  });

  // When the client disconnects
  socket.on("end", () => {
    removeClient(socket);
    console.log("Client disconnected");
  });

  // Handle any errors
  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

/**
 *   CHAT/1.0 AUTH
 *   User: Alice
 *   Token: secret123
 *   Content-Length: 0
 *
 *   body
 */
function parseMessage(message) {
  // Split the Header and Body
  const parts = message.split("\r\n\r\n");
  if (parts.length < 2) return null; // Missing Body

  const headerPart = parts[0];
  const bodyPart = parts[1];

  const headerLine = headerPart.split("\r\n");

  if (headerLine.length === 0) return null;

  const firstLine = headerLine[0].split(" ");
  if (firstLine.length < 2) return null;

  const protocolVersion = firstLine[0];
  const command = firstLine[1];

  const headers = {};
  let contentLength = 0;

  for (let i = 1; i < headerLine.length; i++) {
    const line = headerLine[i];
    const [key, value] = line.split(":");
    headers[key.trim()] = value.trim();

    if (key.trim().toLowerCase() === "content-length") {
      contentLength = parseInt(value.trim(), 10);
    }
  }

  // Optional Check
  if (bodyPart.length !== contentLength) {
    console.warn(
      `Warning: body length ${bodyPart.length} does not match content length header.`,
    );
  }

  return { protocolVersion, command, headers, bodyPart };
}

/**
 * Dispatches the message to the appropriate handler.
 */
function handleMessage(socket, message) {
  switch (message.command) {
    case "AUTH":
      handleAuth(socket, message);
      break;
    case "JOIN":
      handleJoin(socket, message);
      break;
    case "SEND":
      handleSend(socket, message);
      break;
    case "LEAVE":
      handleLeave(socket, message);
      break;
  }
}

function handleAuth(socket, message) {
  const user = message.headers["User"];
  const token = message.headers["Token"];

  if (user && token && token === "secret123") {
    socket.authenticated = true;
    socket.username = user;

    socket.write(formatResponse("OK", "AUTH", { "Content-Length": 0 }, ""));
    console.log(`User ${user} authenticated successfully.`);
  } else {
    socket.write(
      formatResponse(
        "ERROR",
        "AUTH",
        { Error: "Authentication failed", "Content-Length": 0 },
        "",
      ),
    );
    console.log(`Authentication failed for user ${user || "unknown"}.`);
    socket.end();
  }
}

function handleJoin(socket, message) {
  if (!socket.authenticated) {
    socket.write(
      formatResponse(
        "ERROR",
        "JOIN",
        { Error: "Not authenticated", "Content-Length": 0 },
        "",
      ),
    );
    return;
  }
  if (!socket.joined) {
    socket.joined = true;
    socket.write(formatResponse("OK", "JOIN", { "Content-Length": 0 }, ""));
    broadcast(
      createServerMessage(`${socket.username} has joined the chat.`, "JOIN"),
      socket,
    );
    console.log(`User ${socket.username} joined the chat.`);
  }
}

function handleSend(socket, message) {
  if (!socket.authenticated || !socket.joined) {
    socket.write(
      formatResponse(
        "ERROR",
        "SEND",
        { Error: "Not joined or authenticated", "Content-Length": 0 },
        "",
      ),
    );
    return;
  }

  const body = message.bodyPart;

  const broadcastMsg = formatResponse(
    "MESSAGE",
    "SEND",
    { "Content-Length": Buffer.byteLength(body, "utf8") },
    body,
    socket.username,
  );

  broadcast(broadcastMsg, socket);
  console.log(`Broadcasting message from ${socket.username}: ${body}`);
}

function handleLeave(socket, message) {
  if (socket.joined) {
    socket.joined = false;
    socket.write(formatResponse("OK", "LEAVE", { "Content-Length": 0 }, ""));
    broadcast(
      createServerMessage(`${socket.username} has left the chat.`, "LEAVE"),
      socket,
    );
    console.log(`User ${socket.username} left the chat.`);
    socket.end();
  } else {
    socket.write(
      formatResponse(
        "ERROR",
        "LEAVE",
        { Error: "Not in chat", "Content-Length": 0 },
        "",
      ),
    );
  }
}

/**
 * Formats a response message.
 * type: OK, ERROR, or MESSAGE.
 * responseFor: The command this response is for.
 * headers: Additional headers as an object.
 * body: Message body.
 * user (optional): For MESSAGE responses, the sender's username.
 */
function formatResponse(type, responseFor, headers, body, user) {
  let startLine = `CHAT/1.0 ${type}`;

  const headerLines = [];

  headerLines.push(`Response-For: ${responseFor}`);

  if (user && type === "MESSAGE") {
    headerLines.push(`User: ${user}`);
  }

  for (const key in headers) {
    headerLines.push(`${key}: ${headers[key]}`);
  }

  return `${startLine}\r\n${headerLines.join("\r\n")}\r\n\r\n${body}`;
}

/**
 * Creates a server-generated message.
 */
function createServerMessage(text, responseFor) {
  return formatResponse(
    "MESSAGE",
    responseFor,
    { "Content-Length": Buffer.byteLength(text, "utf8") },
    text,
    "SERVER",
  );
}

/**
 * Broadcasts a message to all connected clients (except the sender).
 */
function broadcast(message, senderSocket) {
  clients.forEach((client) => {
    if (client !== senderSocket && client.joined) {
      client.write(message);
    }
  });
}

/**
 * Removes a client from the clients array.
 */
function removeClient(socket) {
  const index = clients.indexOf(socket);
  if (index !== -1) {
    clients.splice(index, 1);
  }
}

server.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});
