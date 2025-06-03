import "dotenv/config";
import { app } from "./app.js";
import connectDB from "./DB/index.js";

const port = process.env.PORT || 3000;

const db = connectDB();

app.get("/", (req, res) => {
    res.send("hello world");
});

app.get("/users", (req, res) => {
    db.query("SELECT * FROM student;", (error, result) => {
        if (error) {
            console.error("Query error:", error);
            return res.status(500).send("Database query failed");
        }
        res.json(result);
    });
});
app.get("/users/:id", (req, res) => {
    const userId = req.params.id;
    db.query(`Select * from student where id =${userId};`, (error, result) => {
        if (error) {
            console.log("Query Error : ", error);
            return res.status(500).send("Database query failed");
        }
        res.json(result);
    });
});
app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});
