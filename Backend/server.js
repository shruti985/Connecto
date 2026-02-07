const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const postRoutes=require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();

// Middlewares
app.use(cors()); // Frontend ko backend se baat karne ki permission dene ke liye
app.use(express.json()); // Frontend se aane wale JSON data ko samajhne ke liye

// Routes setup
// Ab aapke sare auth routes http://localhost:5000/api/auth/... par milenge
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users",userRoutes)
// Ek basic route testing ke liye
app.get("/", (req, res) => {
  res.send("Connecto Backend is running! 🚀");
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test it here: http://localhost:${PORT}`);
});
