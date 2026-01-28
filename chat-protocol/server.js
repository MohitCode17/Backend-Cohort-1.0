import net from "node:net";

const PORT = 1337;
const clients = [];

const server = net.createServer((socket) => {
  /**
   * Set Socket Encoding
   */
  socket.setEncoding("utf-8");

  /**
   * Maintain Socket-level Buffer
   */
  socket.buffer = "";

  /**
   * Maintaine State
   */
  socket.authenticated = false;
  socket.joined = false;
  socket.username = "";

  clients.push(socket);

  socket.on("data", (chunk) => {
    socket.buffer += chunk;
    parseBuffer(socket);
  });

  /**
   * When client disconnect
   */
  socket.on("end", () => {
    removeClient(socket);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

/**
 * Process Buffer Safely
 * We Loop not parse once
 * Fixes: Multiple messages in one TCP chunk
 */
function parseBuffer(socket) {
  while (true) {
    const message = tryParseMessage(socket);

    if (!message) break; // Wait for more data

    handleMessage(socket, message);
  }
}

function tryParseMessage(socket) {
  const buffer = socket.buffer;
  /**
   * Look for header body separator
   * Because header can arrive in pieces:
   * Chunk 1: CHAT/1.0 AUTH\r\nUser:Mo
   * Chunk 2: hit\r\nToken:secret123\r\n\r\n
   */
  const headerEndIndex = buffer.indexOf("\r\n\r\n");
  if (headerEndIndex === -1) {
    return null; // headers not complete yet
  }

  const headerPart = buffer.slice(0, headerEndIndex);
  const lines = headerPart.split("\r\n");

  // Parse start line
  const [protocolVersion, command] = lines[0].split(" ");
  if (!protocolVersion || !command) {
    throw new Error("Invalid start line");
  }

  // Parse headers
  const headers = {};
  let contentLength = 0;

  for (let i = 1; i < lines.length; i++) {
    const index = lines[i].indexOf(":");
    if (index === -1) continue;

    const key = lines[i].slice(0, index).trim();
    const value = lines[i].slice(index + 1).trim();

    headers[key] = value;

    if (key.toLowerCase() === "content-length") {
      contentLength = parseInt(value, 10);
    }
  }

  // Check if full body has arrived
  const totalMessageLength = headerEndIndex + 4 + contentLength;

  if (buffer.length < totalMessageLength) {
    return null; // body incomplete
  }

  // Extract body
  const body = buffer.slice(headerEndIndex + 4, totalMessageLength);

  // Remove consumed message from buffer
  socket.buffer = buffer.slice(totalMessageLength);

  return {
    protocolVersion,
    command,
    headers,
    body,
  };
}

/**
 * Dispatch the message to the appropriate handler
 */
function handleMessage(socket, message) {
  switch (message.command) {
    case "AUTH":
      handleAuth(socket, message);
      break;
    case "JOIN":
      handleJoin(socket);
      break;
    case "SEND":
      handleSend(socket, message);
      break;
    case "LEAVE":
      handleLeave(socket, message);
      break;
  }
}

/**
 * Handle AUTH Logic and Send Success if AUTHENTICATED
 */
function handleAuth(socket, message) {
  const user = message.headers["User"];
  const token = message.headers["Token"];

  if (user && token && token === "secret123") {
    socket.authenticated = true;
    socket.username = user;

    /**
     * Send Success Response to Client
     * CHAT/1.0 OK
     * Response-For: AUTH
     * Content-Length: 0
     */
    socket.write(formatResponse("OK", "AUTH", { "Content-Length": 0 }, ""));

    // console.log(`${user} is authenticated succcessfully.`);
  } else {
    /**
     * Send Error Response to Client
     * CHAT/1.0 ERROR
     * Response-For: AUTH
     * Error: Not authenticated
     * Content-Length: 0
     */
    socket.write(
      formatResponse(
        "ERROR",
        "AUTH",
        { Error: "Authentication failed", "Content-Length": 0 },
        "",
      ),
    );
    // console.error(`Authencation failed for user ${user || "Unknown"}`);
    socket.end();
  }
}

/**
 * Handle JOIN Logic
 */
function handleJoin(socket) {
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

    /**
     * Notification Broadcast
     * Like: <User> has joined the chat...
     */
    broadcast(
      createServerMessage(`${socket.username} has joined the chat.`, "JOIN"),
      socket,
    );
  }
}

/**
 * Handle SEND Logic
 */
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

  const body = message.body;

  const broadCastMsg = formatResponse(
    "MESSAGE",
    "SEND",
    { "Content-Length": Buffer.byteLength(body, "utf8") },
    body,
    socket.username,
  );

  broadcast(broadCastMsg, socket);
}

/**
 * Handle LEAVE Logic
 */
function handleLeave(socket, message) {
  if (socket.joined) {
    socket.joined = false;
    socket.write(formatResponse("OK", "LEAVE", { "Content-Length": 0 }, ""));
    broadcast(
      createServerMessage(`${socket.username} has left the chat.`, "LEAVE"),
      socket,
    );
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
 * Format a response message for client
 * Type: OK, ERROR, MESSAGE
 * Response-For: The command this response is for
 * Headers: Additional headers as an object
 * Body: Message body
 * user: (Optional) For Message responses, the sender's username
 */
function formatResponse(type, responseFor, headers, body, user) {
  const startLine = `CHAT/1.0 ${type}`;
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
 * Design the format of server generated messages.
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
 * Broadcast the messages to all connected clients except the sender
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

server.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
