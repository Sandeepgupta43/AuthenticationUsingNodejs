import mysql from "mysql2";
import "dotenv/config";

const connectDB = () => {
    const connection = mysql.createConnection({
        host: process.env.db_host,
        user: process.env.db_user,
        password: process.env.db_password,
        database: process.env.db_database,
    });
    connection.connect((err) => {
        if (err) {
            console.error("Failed to connect");
        } else {
            console.log("connection success");
        }
    });

    return connection;
};

export default connectDB;
