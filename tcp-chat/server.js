import net from "node:net";

// Store Clients
const clients = [];

const server = net.createServer((socket) => {
  let username = null;

  socket.write("Welcome to the TCP Chat Server!\n");
  socket.write("Please enter your username: ");

  // When Data Received From Client
  socket.on("data", (data) => {
    const message = data.toString().trim();

    // Step 1: If username is not set, treat first input as username
    if (!username) {
      username = message;
      clients.push({ socket, username });
      socket.write(`Hi ${username}! You can now start chatting.\n`);

      broadcast(`${username} has joined the chat!`, socket);
      return; // Important: return here so we don't broadcast username as a message
    }

    // Step 2: Broadcast normal chat messages
    broadcast(`${username}: ${message}`, socket);
  });

  // When User Closes the Connection, Remove it.
  socket.on("end", () => {
    if (username) {
      broadcast(`${username} has left the chat.`, socket);

      const index = clients.findIndex((c) => c.socket === socket);

      if (index !== -1) clients.splice(index, 1);
    }
  });

  // Error Handling
  socket.on("error", (err) => {
    console.log("Socket Error", err);
  });
});

function broadcast(message, senderSocket) {
  clients.forEach(({ socket }) => {
    if (socket !== senderSocket) {
      socket.write(`${message}\n`);
    }
  });
}

server.listen(1337, () => {
  console.log("TCP Chat Server is listening on Port: 1337");
});
