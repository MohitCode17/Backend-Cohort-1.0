import net from "node:net";

// The node:net module provides an asynchronous network API for creating stream-based TCP or IPC servers
const server = net.createServer((socket) => {
  // 'connection' listener.
  console.log("client connected");

  // When data is received from the client
  socket.on("data", (chunk) => {
    console.log("Received:", chunk.toString());

    // Echo the data back to the client
    socket.write(`Received: ${chunk}`);
    socket.end();
  });

  // When the client disconnects
  socket.on("end", () => {
    console.log("Client disconnected");
  });

  // Handle any errors
  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

server.listen(1337, () => {
  console.log("server listening on port 1337");
});
