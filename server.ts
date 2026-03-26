import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory store for vehicles (for demo purposes)
  // In a real app, use Redis or a spatial database
  const vehicles = new Map();

  io.on("connection", (socket) => {
    console.log("Vehicle connected:", socket.id);

    socket.on("update_vehicle", (data) => {
      const vehicleData = {
        ...data,
        id: socket.id,
        lastUpdate: Date.now()
      };
      vehicles.set(socket.id, vehicleData);
      
      // Broadcast to all other vehicles
      // In a real app, only broadcast to nearby vehicles using geohashing
      socket.broadcast.emit("vehicle_update", vehicleData);
    });

    socket.on("hazard_report", (hazard) => {
      console.log("Hazard reported:", hazard);
      io.emit("new_hazard", { ...hazard, id: Math.random().toString(36).substr(2, 9) });
    });

    socket.on("disconnect", () => {
      console.log("Vehicle disconnected:", socket.id);
      vehicles.delete(socket.id);
      io.emit("vehicle_removed", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`V2V Server running on http://localhost:${PORT}`);
  });
}

startServer();
